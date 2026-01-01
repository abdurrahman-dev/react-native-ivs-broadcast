#import "IVSBroadcastModule.h"
#import <AmazonIVSBroadcast/AmazonIVSBroadcast.h>
#import <AVKit/AVKit.h>

static IVSBroadcastModule *sharedInstance = nil;

@interface IVSBroadcastModule () <IVSBroadcastSessionDelegate, AVPictureInPictureControllerDelegate>
@property (nonatomic, strong) NSMutableDictionary<NSString *, IVSBroadcastSession *> *sessions;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSURL *> *sessionUrls;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSString *> *currentCameraPosition;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSNumber *> *isMutedState;
@property (nonatomic, strong) NSMutableDictionary<NSString *, AVPictureInPictureController *> *pipControllers;
@property (nonatomic, assign) BOOL hasListeners;
@end

@implementation IVSBroadcastModule

RCT_EXPORT_MODULE(IVSBroadcastModule);

+ (instancetype)sharedInstance {
    return sharedInstance;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _sessions = [NSMutableDictionary dictionary];
        _sessionUrls = [NSMutableDictionary dictionary];
        _currentCameraPosition = [NSMutableDictionary dictionary];
        _isMutedState = [NSMutableDictionary dictionary];
        _pipControllers = [NSMutableDictionary dictionary];
        _hasListeners = NO;
        sharedInstance = self;
    }
    return self;
}

- (IVSBroadcastSession *)sessionForId:(NSString *)sessionId {
    if (!sessionId) return nil;
    return self.sessions[sessionId];
}

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[
        @"onStateChanged",
        @"onError",
        @"onNetworkHealth",
        @"onAudioStats",
        @"onVideoStats"
    ];
}

- (void)startObserving {
    _hasListeners = YES;
}

- (void)stopObserving {
    _hasListeners = NO;
}

RCT_EXPORT_METHOD(createSession:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            NSString *rtmpUrl = config[@"rtmpUrl"];
            if (!rtmpUrl || rtmpUrl.length == 0) {
                reject(@"CREATE_SESSION_ERROR", @"rtmpUrl is required", nil);
                return;
            }
            
            NSString *streamKey = config[@"streamKey"];
            NSString *fullUrl = (streamKey && streamKey.length > 0) 
                ? [NSString stringWithFormat:@"%@/%@", rtmpUrl, streamKey] 
                : rtmpUrl;
            IVSBroadcastConfiguration *broadcastConfig = [[IVSBroadcastConfiguration alloc] init];
            
            // Video config
            NSDictionary *videoConfig = config[@"videoConfig"];
            if (videoConfig) {
                IVSVideoConfiguration *video = [broadcastConfig video];
                
                if (videoConfig[@"width"] && videoConfig[@"height"]) {
                    CGSize size = CGSizeMake([videoConfig[@"width"] floatValue], 
                                            [videoConfig[@"height"] floatValue]);
                    [video setSize:size error:nil];
                }
                if (videoConfig[@"bitrate"]) {
                    [video setInitialBitrate:[videoConfig[@"bitrate"] integerValue] error:nil];
                }
                if (videoConfig[@"fps"] || videoConfig[@"targetFps"]) {
                    NSNumber *fps = videoConfig[@"targetFps"] ?: videoConfig[@"fps"];
                    [video setTargetFramerate:[fps integerValue] error:nil];
                }
                if (videoConfig[@"keyframeInterval"]) {
                    [video setKeyframeInterval:[videoConfig[@"keyframeInterval"] floatValue] error:nil];
                }
            }
            
            // Audio config
            NSDictionary *audioConfig = config[@"audioConfig"];
            if (audioConfig) {
                IVSAudioConfiguration *audio = [broadcastConfig audio];
                
                if (audioConfig[@"bitrate"]) {
                    [audio setBitrate:[audioConfig[@"bitrate"] integerValue] error:nil];
                }
                if (audioConfig[@"channels"]) {
                    [audio setChannels:[audioConfig[@"channels"] integerValue] error:nil];
                }
            }
            
            NSError *sessionError = nil;
            IVSBroadcastSession *session = [[IVSBroadcastSession alloc] initWithConfiguration:broadcastConfig
                                                                                    descriptors:nil
                                                                                       delegate:self
                                                                                          error:&sessionError];
            
            if (sessionError || !session) {
                reject(@"CREATE_SESSION_ERROR", 
                       sessionError.localizedDescription ?: @"Failed to create broadcast session", 
                       sessionError);
                return;
            }
            
            NSString *sessionId = [[NSUUID UUID] UUIDString];
            self.sessions[sessionId] = session;
            self.sessionUrls[sessionId] = [NSURL URLWithString:fullUrl];
            self.currentCameraPosition[sessionId] = @"back";
            self.isMutedState[sessionId] = @NO;
            
            // Varsayılan cihazları ekle
            [self setupDefaultDevicesForSession:session sessionId:sessionId];
            
            resolve(sessionId);
        } @catch (NSException *exception) {
            reject(@"CREATE_SESSION_ERROR", exception.reason, nil);
        }
    });
}

- (void)setupDefaultDevicesForSession:(IVSBroadcastSession *)session sessionId:(NSString *)sessionId {
    @try {
        NSArray<IVSDeviceDescriptor *> *devices = [IVSBroadcastSession listAvailableDevices];
        
        // Kamera ekle (öncelikle arka kamera)
        IVSDeviceDescriptor *backCamera = nil;
        IVSDeviceDescriptor *frontCamera = nil;
        
        for (IVSDeviceDescriptor *device in devices) {
            if (device.type == IVSDeviceTypeCamera) {
                if (device.position == IVSDevicePositionBack) {
                    backCamera = device;
                } else if (device.position == IVSDevicePositionFront) {
                    frontCamera = device;
                }
            }
        }
        
        IVSDeviceDescriptor *selectedCamera = backCamera ?: frontCamera;
        if (selectedCamera) {
            [session attachDeviceDescriptor:selectedCamera toSlotWithName:nil onComplete:^(id<IVSDevice> _Nullable device, NSError * _Nullable error) {
                if (device) {
                    self.currentCameraPosition[sessionId] = (selectedCamera.position == IVSDevicePositionFront) ? @"front" : @"back";
                }
            }];
        }
        
        // Mikrofon ekle
        for (IVSDeviceDescriptor *device in devices) {
            if (device.type == IVSDeviceTypeMicrophone) {
                [session attachDeviceDescriptor:device toSlotWithName:nil onComplete:nil];
                break;
            }
        }
    } @catch (NSException *exception) {
        // Device setup hatalarını sessizce geç
    }
}

RCT_EXPORT_METHOD(startBroadcast:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"START_BROADCAST_ERROR", @"Session not found", nil);
                return;
            }
            
            NSURL *url = self.sessionUrls[sessionId];
            if (!url) {
                reject(@"START_BROADCAST_ERROR", @"Session URL not found", nil);
                return;
            }
            
            NSError *error = nil;
            [session startWithURL:url streamKey:@"" error:&error];
            
            if (error) {
                reject(@"START_BROADCAST_ERROR", error.localizedDescription, error);
                return;
            }
            
            resolve(nil);
        } @catch (NSException *exception) {
            reject(@"START_BROADCAST_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(stopBroadcast:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"STOP_BROADCAST_ERROR", @"Session not found", nil);
                return;
            }
            
            [session stop];
            resolve(nil);
        } @catch (NSException *exception) {
            reject(@"STOP_BROADCAST_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(pauseBroadcast:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"PAUSE_BROADCAST_ERROR", @"Session not found", nil);
                return;
            }
            
            // IVS SDK'da doğrudan pause yok
            resolve(nil);
        } @catch (NSException *exception) {
            reject(@"PAUSE_BROADCAST_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(resumeBroadcast:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"RESUME_BROADCAST_ERROR", @"Session not found", nil);
                return;
            }
            
            resolve(nil);
        } @catch (NSException *exception) {
            reject(@"RESUME_BROADCAST_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(destroySession:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"DESTROY_SESSION_ERROR", @"Session not found", nil);
                return;
            }
            
            [session stop];
            [self.sessions removeObjectForKey:sessionId];
            [self.sessionUrls removeObjectForKey:sessionId];
            [self.currentCameraPosition removeObjectForKey:sessionId];
            [self.isMutedState removeObjectForKey:sessionId];
            
            resolve(nil);
        } @catch (NSException *exception) {
            reject(@"DESTROY_SESSION_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(getState:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"GET_STATE_ERROR", @"Session not found", nil);
                return;
            }
            
            // Session state'i delegate callback'lerinden takip ediyoruz
            BOOL isConnected = NO;
            
            NSDictionary *state = @{
                @"isBroadcasting": @(isConnected),
                @"isPaused": @NO,
                @"state": @"UNKNOWN"
            };
            
            resolve(state);
        } @catch (NSException *exception) {
            reject(@"GET_STATE_ERROR", exception.reason, nil);
        }
    });
}

- (NSString *)stateToString:(IVSBroadcastSessionState)state {
    switch (state) {
        case IVSBroadcastSessionStateInvalid:
            return @"INVALID";
        case IVSBroadcastSessionStateDisconnected:
            return @"DISCONNECTED";
        case IVSBroadcastSessionStateConnecting:
            return @"CONNECTING";
        case IVSBroadcastSessionStateConnected:
            return @"CONNECTED";
        case IVSBroadcastSessionStateError:
            return @"ERROR";
        default:
            return @"UNKNOWN";
    }
}

RCT_EXPORT_METHOD(switchCamera:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"SWITCH_CAMERA_ERROR", @"Session not found", nil);
                return;
            }
            
            NSString *currentPosition = self.currentCameraPosition[sessionId] ?: @"back";
            NSString *newPosition = [currentPosition isEqualToString:@"back"] ? @"front" : @"back";
            
            [self switchToCamera:newPosition session:session sessionId:sessionId resolve:resolve reject:reject];
        } @catch (NSException *exception) {
            reject(@"SWITCH_CAMERA_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(setCameraPosition:(NSString *)sessionId
                  position:(NSString *)position
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"SET_CAMERA_POSITION_ERROR", @"Session not found", nil);
                return;
            }
            
            if (![position isEqualToString:@"front"] && ![position isEqualToString:@"back"]) {
                reject(@"SET_CAMERA_POSITION_ERROR", 
                       [NSString stringWithFormat:@"Invalid camera position: %@", position], nil);
                return;
            }
            
            [self switchToCamera:position session:session sessionId:sessionId resolve:resolve reject:reject];
        } @catch (NSException *exception) {
            reject(@"SET_CAMERA_POSITION_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(selectCamera:(NSString *)sessionId
                  deviceId:(NSString *)deviceId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"SELECT_CAMERA_ERROR", @"Session not found", nil);
                return;
            }
            
            // Tüm kullanılabilir cihazları listele
            NSArray<IVSDeviceDescriptor *> *availableDevices = [IVSBroadcastSession listAvailableDevices];
            IVSDeviceDescriptor *targetCamera = nil;
            
            // deviceId ile kamerayı bul
            for (IVSDeviceDescriptor *device in availableDevices) {
                if (device.type == IVSDeviceTypeCamera && 
                    [device.urn isEqualToString:deviceId]) {
                    targetCamera = device;
                    break;
                }
            }
            
            if (!targetCamera) {
                reject(@"SELECT_CAMERA_ERROR", 
                       [NSString stringWithFormat:@"Camera with deviceId '%@' not found", deviceId], nil);
                return;
            }
            
            // Mevcut kamerayı bul
            NSArray<id<IVSDevice>> *attachedDevices = [session listAttachedDevices];
            id<IVSDevice> currentCamera = nil;
            
            for (id<IVSDevice> device in attachedDevices) {
                if (device.descriptor.type == IVSDeviceTypeCamera) {
                    currentCamera = device;
                    break;
                }
            }
            
            // Kamera pozisyonunu güncelle
            NSString *position = (targetCamera.position == IVSDevicePositionFront) ? @"front" : @"back";
            
            if (currentCamera) {
                // Mevcut kamerayı yeni kamerayla değiştir
                [session exchangeOldDevice:currentCamera withNewDevice:targetCamera onComplete:^(id<IVSDevice> _Nullable newDevice, NSError * _Nullable error) {
                    if (newDevice) {
                        self.currentCameraPosition[sessionId] = position;
                        
                        // Kamera değişti, PreviewView'ları bilgilendir
                        [[NSNotificationCenter defaultCenter] postNotificationName:@"IVSCameraDeviceChanged" 
                                                                        object:nil 
                                                                      userInfo:@{@"sessionId": sessionId}];
                        resolve(nil);
                    } else {
                        reject(@"SELECT_CAMERA_ERROR", error.localizedDescription ?: @"Failed to select camera", error);
                    }
                }];
            } else {
                // Kamera yoksa yeni kamerayı ekle
                [session attachDeviceDescriptor:targetCamera toSlotWithName:nil onComplete:^(id<IVSDevice> _Nullable device, NSError * _Nullable error) {
                    if (device) {
                        self.currentCameraPosition[sessionId] = position;
                        resolve(nil);
                    } else {
                        reject(@"SELECT_CAMERA_ERROR", error.localizedDescription ?: @"Failed to attach camera", error);
                    }
                }];
            }
        } @catch (NSException *exception) {
            reject(@"SELECT_CAMERA_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(selectMicrophone:(NSString *)sessionId
                  deviceId:(NSString *)deviceId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"SELECT_MICROPHONE_ERROR", @"Session not found", nil);
                return;
            }
            
            // Tüm kullanılabilir cihazları listele
            NSArray<IVSDeviceDescriptor *> *availableDevices = [IVSBroadcastSession listAvailableDevices];
            IVSDeviceDescriptor *targetMicrophone = nil;
            
            // deviceId ile mikrofonu bul
            for (IVSDeviceDescriptor *device in availableDevices) {
                if (device.type == IVSDeviceTypeMicrophone && 
                    [device.urn isEqualToString:deviceId]) {
                    targetMicrophone = device;
                    break;
                }
            }
            
            if (!targetMicrophone) {
                reject(@"SELECT_MICROPHONE_ERROR", 
                       [NSString stringWithFormat:@"Microphone with deviceId '%@' not found", deviceId], nil);
                return;
            }
            
            // Mevcut mikrofonu bul
            NSArray<id<IVSDevice>> *attachedDevices = [session listAttachedDevices];
            id<IVSDevice> currentMicrophone = nil;
            
            for (id<IVSDevice> device in attachedDevices) {
                if (device.descriptor.type == IVSDeviceTypeMicrophone) {
                    currentMicrophone = device;
                    break;
                }
            }
            
            if (currentMicrophone) {
                // Mevcut mikrofonu yeni mikrofonla değiştir
                [session exchangeOldDevice:currentMicrophone withNewDevice:targetMicrophone onComplete:^(id<IVSDevice> _Nullable newDevice, NSError * _Nullable error) {
                    if (newDevice) {
                        resolve(nil);
                    } else {
                        reject(@"SELECT_MICROPHONE_ERROR", error.localizedDescription ?: @"Failed to select microphone", error);
                    }
                }];
            } else {
                // Mikrofon yoksa yeni mikrofonu ekle
                [session attachDeviceDescriptor:targetMicrophone toSlotWithName:nil onComplete:^(id<IVSDevice> _Nullable device, NSError * _Nullable error) {
                    if (device) {
                        resolve(nil);
                    } else {
                        reject(@"SELECT_MICROPHONE_ERROR", error.localizedDescription ?: @"Failed to attach microphone", error);
                    }
                }];
            }
        } @catch (NSException *exception) {
            reject(@"SELECT_MICROPHONE_ERROR", exception.reason, nil);
        }
    });
}

- (void)switchToCamera:(NSString *)position 
               session:(IVSBroadcastSession *)session 
             sessionId:(NSString *)sessionId
               resolve:(RCTPromiseResolveBlock)resolve 
                reject:(RCTPromiseRejectBlock)reject {
    
    IVSDevicePosition targetPosition = [position isEqualToString:@"front"] 
        ? IVSDevicePositionFront 
        : IVSDevicePositionBack;
    
    NSArray<IVSDeviceDescriptor *> *devices = [IVSBroadcastSession listAvailableDevices];
    IVSDeviceDescriptor *targetCamera = nil;
    
    for (IVSDeviceDescriptor *device in devices) {
        if (device.type == IVSDeviceTypeCamera && device.position == targetPosition) {
            targetCamera = device;
            break;
        }
    }
    
    if (!targetCamera) {
        reject(@"SWITCH_CAMERA_ERROR", 
               [NSString stringWithFormat:@"Camera not available: %@", position], nil);
        return;
    }
    
    // Mevcut kamerayı bul
    NSArray<id<IVSDevice>> *attachedDevices = [session listAttachedDevices];
    id<IVSDevice> currentCamera = nil;
    
    for (id<IVSDevice> device in attachedDevices) {
        if (device.descriptor.type == IVSDeviceTypeCamera) {
            currentCamera = device;
            break;
        }
    }
    
    if (currentCamera) {
        [session exchangeOldDevice:currentCamera withNewDevice:targetCamera onComplete:^(id<IVSDevice> _Nullable newDevice, NSError * _Nullable error) {
            if (newDevice) {
                self.currentCameraPosition[sessionId] = position;
                
                // Kamera değişti, PreviewView'ları bilgilendir
                [[NSNotificationCenter defaultCenter] postNotificationName:@"IVSCameraDeviceChanged" 
                                                                    object:nil 
                                                                  userInfo:@{@"sessionId": sessionId}];
                resolve(nil);
            } else {
                reject(@"SWITCH_CAMERA_ERROR", error.localizedDescription ?: @"Failed to switch camera", error);
            }
        }];
    } else {
        [session attachDeviceDescriptor:targetCamera toSlotWithName:nil onComplete:^(id<IVSDevice> _Nullable device, NSError * _Nullable error) {
            if (device) {
                self.currentCameraPosition[sessionId] = position;
                resolve(nil);
            } else {
                reject(@"SWITCH_CAMERA_ERROR", error.localizedDescription ?: @"Failed to attach camera", error);
            }
        }];
    }
}

RCT_EXPORT_METHOD(setMuted:(NSString *)sessionId
                  muted:(BOOL)muted
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"SET_MUTED_ERROR", @"Session not found", nil);
                return;
            }
            
            NSArray<id<IVSDevice>> *attachedDevices = [session listAttachedDevices];
            for (id<IVSDevice> device in attachedDevices) {
                if (device.descriptor.type == IVSDeviceTypeMicrophone) {
                    if ([device conformsToProtocol:@protocol(IVSAudioDevice)]) {
                        id<IVSAudioDevice> audioDevice = (id<IVSAudioDevice>)device;
                        [audioDevice setGain:(muted ? 0.0f : 1.0f)];
                        self.isMutedState[sessionId] = @(muted);
                    }
                    break;
                }
            }
            
            resolve(nil);
        } @catch (NSException *exception) {
            reject(@"SET_MUTED_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(isMuted:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"IS_MUTED_ERROR", @"Session not found", nil);
                return;
            }
            
            BOOL muted = [self.isMutedState[sessionId] boolValue];
            resolve(@(muted));
        } @catch (NSException *exception) {
            reject(@"IS_MUTED_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(updateVideoConfig:(NSString *)sessionId
                  config:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            // IVS SDK'da session oluşturulduktan sonra video config değiştirilemez
            resolve(nil);
        } @catch (NSException *exception) {
            reject(@"UPDATE_VIDEO_CONFIG_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(updateAudioConfig:(NSString *)sessionId
                  config:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            // IVS SDK'da session oluşturulduktan sonra audio config değiştirilemez
            resolve(nil);
        } @catch (NSException *exception) {
            reject(@"UPDATE_AUDIO_CONFIG_ERROR", exception.reason, nil);
        }
    });
}

#pragma mark - IVSBroadcastSessionDelegate

- (void)broadcastSession:(IVSBroadcastSession *)session didChangeState:(IVSBroadcastSessionState)state {
    if (!self.hasListeners) return;
    
    NSString *sessionId = [self sessionIdForSession:session];
    if (!sessionId) return;
    
    NSDictionary *stateDict = @{
        @"isBroadcasting": @(state == IVSBroadcastSessionStateConnected),
        @"isPaused": @NO,
        @"state": [self stateToString:state],
        @"sessionId": sessionId
    };
    
    [self sendEventWithName:@"onStateChanged" body:stateDict];
}

- (void)broadcastSession:(IVSBroadcastSession *)session didEmitError:(NSError *)error {
    if (!self.hasListeners) return;
    
    NSString *sessionId = [self sessionIdForSession:session];
    if (!sessionId) return;
    
    NSDictionary *errorDict = @{
        @"message": error.localizedDescription ?: @"Unknown error",
        @"code": @(error.code).stringValue,
        @"sessionId": sessionId
    };
    
    [self sendEventWithName:@"onError" body:errorDict];
}

- (void)broadcastSession:(IVSBroadcastSession *)session didAddDevice:(id<IVSDevice>)device {
    // Device eklendi - PreviewView'ları güncelle
    NSString *sessionId = [self sessionIdForSession:session];
    if (sessionId && device.descriptor.type == IVSDeviceTypeCamera) {
        // Kamera değişti, PreviewView'ları bilgilendir
        [[NSNotificationCenter defaultCenter] postNotificationName:@"IVSCameraDeviceChanged" 
                                                            object:nil 
                                                          userInfo:@{@"sessionId": sessionId}];
    }
}

- (void)broadcastSession:(IVSBroadcastSession *)session didRemoveDevice:(IVSDeviceDescriptor *)descriptor {
    // Device kaldırıldı
}

- (void)broadcastSession:(IVSBroadcastSession *)session didChangeNetworkHealth:(id)networkHealth {
    if (!self.hasListeners) return;
    
    NSString *sessionId = [self sessionIdForSession:session];
    if (!sessionId) return;
    
    NSString *qualityString = @"unknown";
    NSInteger quality = [[networkHealth valueForKey:@"quality"] integerValue];
    
    switch (quality) {
        case 0: // IVSNetworkQualityExcellent
            qualityString = @"excellent";
            break;
        case 1: // IVSNetworkQualityGood
            qualityString = @"good";
            break;
        case 2: // IVSNetworkQualityFair
            qualityString = @"fair";
            break;
        case 3: // IVSNetworkQualityPoor
            qualityString = @"poor";
            break;
        default:
            break;
    }
    
    NSMutableDictionary *healthDict = [NSMutableDictionary dictionary];
    healthDict[@"networkQuality"] = qualityString;
    healthDict[@"sessionId"] = sessionId;
    
    NSNumber *uplinkBandwidth = [networkHealth valueForKey:@"uplinkBandwidth"];
    if (uplinkBandwidth && [uplinkBandwidth doubleValue] > 0) {
        healthDict[@"uplinkBandwidth"] = uplinkBandwidth;
    }
    
    NSNumber *rtt = [networkHealth valueForKey:@"rtt"];
    if (rtt && [rtt doubleValue] > 0) {
        healthDict[@"rtt"] = rtt;
    }
    
    [self sendEventWithName:@"onNetworkHealth" body:healthDict];
}

- (void)broadcastSession:(IVSBroadcastSession *)session didEmitAudioStats:(id)audioStats {
    if (!self.hasListeners) return;
    
    NSString *sessionId = [self sessionIdForSession:session];
    if (!sessionId) return;
    
    NSDictionary *statsDict = @{
        @"bitrate": [audioStats valueForKey:@"bitrate"] ?: @0,
        @"sampleRate": [audioStats valueForKey:@"sampleRate"] ?: @0,
        @"channels": [audioStats valueForKey:@"channels"] ?: @0,
        @"sessionId": sessionId
    };
    
    [self sendEventWithName:@"onAudioStats" body:statsDict];
}

- (void)broadcastSession:(IVSBroadcastSession *)session didEmitVideoStats:(id)videoStats {
    if (!self.hasListeners) return;
    
    NSString *sessionId = [self sessionIdForSession:session];
    if (!sessionId) return;
    
    NSDictionary *statsDict = @{
        @"bitrate": [videoStats valueForKey:@"bitrate"] ?: @0,
        @"fps": [videoStats valueForKey:@"fps"] ?: @0,
        @"width": [videoStats valueForKey:@"width"] ?: @0,
        @"height": [videoStats valueForKey:@"height"] ?: @0,
        @"sessionId": sessionId
    };
    
    [self sendEventWithName:@"onVideoStats" body:statsDict];
}

- (NSString *)sessionIdForSession:(IVSBroadcastSession *)session {
    for (NSString *sessionId in self.sessions.allKeys) {
        if (self.sessions[sessionId] == session) {
            return sessionId;
        }
    }
    return nil;
}

// MARK: - Gelişmiş Özellikler

RCT_EXPORT_METHOD(listAvailableDevices:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            NSArray<IVSDeviceDescriptor *> *devices = [IVSBroadcastSession listAvailableDevices];
            NSMutableArray *deviceArray = [NSMutableArray array];
            
            for (IVSDeviceDescriptor *device in devices) {
                NSDictionary *deviceDict = @{
                    @"type": [self deviceTypeToString:device.type],
                    @"position": [self devicePositionToString:device.position],
                    @"deviceId": device.urn ?: @"",
                    @"friendlyName": device.friendlyName ?: @"",
                    @"isDefault": @(device.isDefault)
                };
                [deviceArray addObject:deviceDict];
            }
            
            resolve(deviceArray);
        } @catch (NSException *exception) {
            reject(@"LIST_DEVICES_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(listAttachedDevices:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"LIST_ATTACHED_DEVICES_ERROR", @"Session not found", nil);
                return;
            }
            
            NSArray<id<IVSDevice>> *devices = [session listAttachedDevices];
            NSMutableArray *deviceArray = [NSMutableArray array];
            
            for (id<IVSDevice> device in devices) {
                NSDictionary *deviceDict = @{
                    @"type": [self deviceTypeToString:device.descriptor.type],
                    @"position": [self devicePositionToString:device.descriptor.position],
                    @"deviceId": device.descriptor.urn ?: @"",
                    @"friendlyName": device.descriptor.friendlyName ?: @"",
                    @"isDefault": @(device.descriptor.isDefault)
                };
                [deviceArray addObject:deviceDict];
            }
            
            resolve(deviceArray);
        } @catch (NSException *exception) {
            reject(@"LIST_ATTACHED_DEVICES_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(setCameraZoom:(NSString *)sessionId
                  zoomFactor:(double)zoomFactor
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"SET_ZOOM_ERROR", @"Session not found", nil);
                return;
            }
            
            NSArray<id<IVSDevice>> *attachedDevices = [session listAttachedDevices];
            for (id<IVSDevice> device in attachedDevices) {
                if (device.descriptor.type == IVSDeviceTypeCamera) {
                    if ([device conformsToProtocol:@protocol(IVSCamera)]) {
                        id<IVSCamera> camera = (id<IVSCamera>)device;
                        [camera setVideoZoomFactor:zoomFactor];
                        resolve(nil);
                        return;
                    }
                }
            }
            
            reject(@"SET_ZOOM_ERROR", @"Camera not found", nil);
        } @catch (NSException *exception) {
            reject(@"SET_ZOOM_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(setTorchEnabled:(NSString *)sessionId
                  enabled:(BOOL)enabled
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"SET_TORCH_ERROR", @"Session not found", nil);
                return;
            }
            
            NSArray<id<IVSDevice>> *attachedDevices = [session listAttachedDevices];
            for (id<IVSDevice> device in attachedDevices) {
                if (device.descriptor.type == IVSDeviceTypeCamera) {
                    if ([device conformsToProtocol:@protocol(IVSCamera)]) {
                        id<IVSCamera> camera = (id<IVSCamera>)device;
                        if (camera.isTorchSupported) {
                            camera.torchEnabled = enabled;
                            resolve(nil);
                            return;
                        } else {
                            reject(@"SET_TORCH_ERROR", @"Torch not supported on this camera", nil);
                            return;
                        }
                    }
                }
            }
            
            reject(@"SET_TORCH_ERROR", @"Camera not found", nil);
        } @catch (NSException *exception) {
            reject(@"SET_TORCH_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(getCameraCapabilities:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"GET_CAPABILITIES_ERROR", @"Session not found", nil);
                return;
            }
            
            NSArray<id<IVSDevice>> *attachedDevices = [session listAttachedDevices];
            for (id<IVSDevice> device in attachedDevices) {
                if (device.descriptor.type == IVSDeviceTypeCamera) {
                    if ([device conformsToProtocol:@protocol(IVSCamera)]) {
                        id<IVSCamera> camera = (id<IVSCamera>)device;
                        NSDictionary *capabilities = @{
                            @"minZoomFactor": @(camera.minAvailableVideoZoomFactor),
                            @"maxZoomFactor": @(camera.maxAvailableVideoZoomFactor),
                            @"isTorchSupported": @(camera.isTorchSupported)
                        };
                        resolve(capabilities);
                        return;
                    }
                }
            }
            
            reject(@"GET_CAPABILITIES_ERROR", @"Camera not found", nil);
        } @catch (NSException *exception) {
            reject(@"GET_CAPABILITIES_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(sendTimedMetadata:(NSString *)sessionId
                  metadata:(NSString *)metadata
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"SEND_METADATA_ERROR", @"Session not found", nil);
                return;
            }
            
            NSError *error = nil;
            BOOL success = [session sendTimedMetadata:metadata error:&error];
            
            if (success) {
                resolve(nil);
            } else {
                reject(@"SEND_METADATA_ERROR", error.localizedDescription ?: @"Failed to send metadata", error);
            }
        } @catch (NSException *exception) {
            reject(@"SEND_METADATA_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(setAudioGain:(NSString *)sessionId
                  gain:(double)gain
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"SET_GAIN_ERROR", @"Session not found", nil);
                return;
            }
            
            NSArray<id<IVSDevice>> *attachedDevices = [session listAttachedDevices];
            for (id<IVSDevice> device in attachedDevices) {
                if (device.descriptor.type == IVSDeviceTypeMicrophone) {
                    if ([device conformsToProtocol:@protocol(IVSAudioDevice)]) {
                        id<IVSAudioDevice> audioDevice = (id<IVSAudioDevice>)device;
                        [audioDevice setGain:gain];
                        resolve(nil);
                        return;
                    }
                }
            }
            
            reject(@"SET_GAIN_ERROR", @"Microphone not found", nil);
        } @catch (NSException *exception) {
            reject(@"SET_GAIN_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(getAudioGain:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            IVSBroadcastSession *session = self.sessions[sessionId];
            if (!session) {
                reject(@"GET_GAIN_ERROR", @"Session not found", nil);
                return;
            }
            
            NSArray<id<IVSDevice>> *attachedDevices = [session listAttachedDevices];
            for (id<IVSDevice> device in attachedDevices) {
                if (device.descriptor.type == IVSDeviceTypeMicrophone) {
                    if ([device conformsToProtocol:@protocol(IVSAudioDevice)]) {
                        id<IVSAudioDevice> audioDevice = (id<IVSAudioDevice>)device;
                        float gain = [audioDevice gain];
                        resolve(@(gain));
                        return;
                    }
                }
            }
            
            reject(@"GET_GAIN_ERROR", @"Microphone not found", nil);
        } @catch (NSException *exception) {
            reject(@"GET_GAIN_ERROR", exception.reason, nil);
        }
    });
}

// Helper methods
- (NSString *)deviceTypeToString:(IVSDeviceType)type {
    switch (type) {
        case IVSDeviceTypeCamera:
            return @"camera";
        case IVSDeviceTypeMicrophone:
            return @"microphone";
        case IVSDeviceTypeUserAudio:
            return @"userAudio";
        case IVSDeviceTypeUserImage:
            return @"userVideo";
        default:
            return @"unknown";
    }
}

- (NSString *)devicePositionToString:(IVSDevicePosition)position {
    switch (position) {
        case IVSDevicePositionFront:
            return @"front";
        case IVSDevicePositionBack:
            return @"back";
        default:
            return @"unknown";
    }
}

// MARK: - Picture-in-Picture

RCT_EXPORT_METHOD(isPictureInPictureSupported:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (@available(iOS 15.0, *)) {
        BOOL supported = [AVPictureInPictureController isPictureInPictureSupported];
        resolve(@(supported));
    } else {
        resolve(@NO);
    }
}

RCT_EXPORT_METHOD(startPictureInPicture:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (@available(iOS 15.0, *)) {
        dispatch_async(dispatch_get_main_queue(), ^{
            @try {
                IVSBroadcastSession *session = self.sessions[sessionId];
                if (!session) {
                    reject(@"START_PIP_ERROR", @"Session not found", nil);
                    return;
                }
                
                // Session'dan preview view al
                NSError *error = nil;
                IVSImagePreviewView *previewView = [session previewViewWithAspectMode:IVSAspectModeFill error:&error];
                
                if (!previewView || error) {
                    reject(@"START_PIP_ERROR", @"Failed to get preview view", error);
                    return;
                }
                
                // PiP controller oluştur
                AVPictureInPictureController *pipController = [[AVPictureInPictureController alloc] initWithIVSImagePreviewView:previewView];
                
                if (!pipController) {
                    reject(@"START_PIP_ERROR", @"Failed to create PiP controller", nil);
                    return;
                }
                
                pipController.delegate = self;
                self.pipControllers[sessionId] = pipController;
                
                if (pipController.isPictureInPicturePossible) {
                    [pipController startPictureInPicture];
                    resolve(nil);
                } else {
                    reject(@"START_PIP_ERROR", @"Cannot start Picture-in-Picture", nil);
                }
            } @catch (NSException *exception) {
                reject(@"START_PIP_ERROR", exception.reason, nil);
            }
        });
    } else {
        reject(@"START_PIP_ERROR", @"Picture-in-Picture requires iOS 15.0 or later", nil);
    }
}

RCT_EXPORT_METHOD(stopPictureInPicture:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (@available(iOS 15.0, *)) {
        dispatch_async(dispatch_get_main_queue(), ^{
            @try {
                AVPictureInPictureController *pipController = self.pipControllers[sessionId];
                if (!pipController) {
                    reject(@"STOP_PIP_ERROR", @"PiP controller not found", nil);
                    return;
                }
                
                if (pipController.isPictureInPictureActive) {
                    [pipController stopPictureInPicture];
                }
                
                [self.pipControllers removeObjectForKey:sessionId];
                resolve(nil);
            } @catch (NSException *exception) {
                reject(@"STOP_PIP_ERROR", exception.reason, nil);
            }
        });
    } else {
        reject(@"STOP_PIP_ERROR", @"Picture-in-Picture requires iOS 15.0 or later", nil);
    }
}

RCT_EXPORT_METHOD(getPictureInPictureState:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (@available(iOS 15.0, *)) {
        dispatch_async(dispatch_get_main_queue(), ^{
            @try {
                AVPictureInPictureController *pipController = self.pipControllers[sessionId];
                if (!pipController) {
                    resolve(@"idle");
                    return;
                }
                
                if (pipController.isPictureInPictureActive) {
                    resolve(@"active");
                } else if (pipController.isPictureInPicturePossible) {
                    resolve(@"idle");
                } else {
                    resolve(@"stopped");
                }
            } @catch (NSException *exception) {
                reject(@"GET_PIP_STATE_ERROR", exception.reason, nil);
            }
        });
    } else {
        resolve(@"unsupported");
    }
}

#pragma mark - AVPictureInPictureControllerDelegate

- (void)pictureInPictureControllerWillStartPictureInPicture:(AVPictureInPictureController *)pictureInPictureController {
    // PiP başlıyor
}

- (void)pictureInPictureControllerDidStartPictureInPicture:(AVPictureInPictureController *)pictureInPictureController {
    // PiP başladı
}

- (void)pictureInPictureControllerWillStopPictureInPicture:(AVPictureInPictureController *)pictureInPictureController {
    // PiP duruyor
}

- (void)pictureInPictureControllerDidStopPictureInPicture:(AVPictureInPictureController *)pictureInPictureController {
    // PiP durdu
}

@end
