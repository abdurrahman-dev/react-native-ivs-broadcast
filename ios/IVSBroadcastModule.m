#import "IVSBroadcastModule.h"
#import <AmazonIVSBroadcast/AmazonIVSBroadcast.h>

static IVSBroadcastModule *sharedInstance = nil;

@interface IVSBroadcastModule () <IVSBroadcastSessionDelegate>
@property (nonatomic, strong) NSMutableDictionary<NSString *, IVSBroadcastSession *> *sessions;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSURL *> *sessionUrls;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSString *> *currentCameraPosition;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSNumber *> *isMutedState;
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
            
            NSError *configError = nil;
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
            [session attachDevice:selectedCamera withOnComplete:^(IVSDevice * _Nullable device, NSError * _Nullable error) {
                if (device) {
                    self.currentCameraPosition[sessionId] = (selectedCamera.position == IVSDevicePositionFront) ? @"front" : @"back";
                }
            }];
        }
        
        // Mikrofon ekle
        for (IVSDeviceDescriptor *device in devices) {
            if (device.type == IVSDeviceTypeMicrophone) {
                [session attachDevice:device withOnComplete:^(IVSDevice * _Nullable device, NSError * _Nullable error) {
                    // Mikrofon eklendi
                }];
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
            [session startWithURL:url error:&error];
            
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
            
            BOOL isConnected = (session.state == IVSBroadcastSessionStateConnected);
            
            NSDictionary *state = @{
                @"isBroadcasting": @(isConnected),
                @"isPaused": @NO,
                @"state": [self stateToString:session.state]
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
    NSArray<IVSDevice *> *attachedDevices = [session listAttachedDevices];
    IVSDevice *currentCamera = nil;
    
    for (IVSDevice *device in attachedDevices) {
        if (device.descriptor.type == IVSDeviceTypeCamera) {
            currentCamera = device;
            break;
        }
    }
    
    if (currentCamera) {
        [session exchangeOldDevice:currentCamera withNewDevice:targetCamera onComplete:^(IVSDevice * _Nullable newDevice, NSError * _Nullable error) {
            if (newDevice) {
                self.currentCameraPosition[sessionId] = position;
                resolve(nil);
            } else {
                reject(@"SWITCH_CAMERA_ERROR", error.localizedDescription ?: @"Failed to switch camera", error);
            }
        }];
    } else {
        [session attachDevice:targetCamera withOnComplete:^(IVSDevice * _Nullable device, NSError * _Nullable error) {
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
            
            NSArray<IVSDevice *> *attachedDevices = [session listAttachedDevices];
            for (IVSDevice *device in attachedDevices) {
                if (device.descriptor.type == IVSDeviceTypeMicrophone) {
                    if ([device isKindOfClass:[IVSAudioDevice class]]) {
                        IVSAudioDevice *audioDevice = (IVSAudioDevice *)device;
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

- (void)broadcastSession:(IVSBroadcastSession *)session didAddDevice:(IVSDevice *)device {
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

- (void)broadcastSession:(IVSBroadcastSession *)session didChangeNetworkHealth:(IVSNetworkHealth *)networkHealth {
    if (!self.hasListeners) return;
    
    NSString *sessionId = [self sessionIdForSession:session];
    if (!sessionId) return;
    
    NSString *qualityString = @"unknown";
    switch (networkHealth.quality) {
        case IVSNetworkQualityExcellent:
            qualityString = @"excellent";
            break;
        case IVSNetworkQualityGood:
            qualityString = @"good";
            break;
        case IVSNetworkQualityFair:
            qualityString = @"fair";
            break;
        case IVSNetworkQualityPoor:
            qualityString = @"poor";
            break;
        default:
            break;
    }
    
    NSMutableDictionary *healthDict = [NSMutableDictionary dictionary];
    healthDict[@"networkQuality"] = qualityString;
    healthDict[@"sessionId"] = sessionId;
    
    if (networkHealth.uplinkBandwidth > 0) {
        healthDict[@"uplinkBandwidth"] = @(networkHealth.uplinkBandwidth);
    }
    if (networkHealth.rtt > 0) {
        healthDict[@"rtt"] = @(networkHealth.rtt);
    }
    
    [self sendEventWithName:@"onNetworkHealth" body:healthDict];
}

- (void)broadcastSession:(IVSBroadcastSession *)session didEmitAudioStats:(IVSAudioStats *)audioStats {
    if (!self.hasListeners) return;
    
    NSString *sessionId = [self sessionIdForSession:session];
    if (!sessionId) return;
    
    NSDictionary *statsDict = @{
        @"bitrate": @(audioStats.bitrate),
        @"sampleRate": @(audioStats.sampleRate),
        @"channels": @(audioStats.channels),
        @"sessionId": sessionId
    };
    
    [self sendEventWithName:@"onAudioStats" body:statsDict];
}

- (void)broadcastSession:(IVSBroadcastSession *)session didEmitVideoStats:(IVSVideoStats *)videoStats {
    if (!self.hasListeners) return;
    
    NSString *sessionId = [self sessionIdForSession:session];
    if (!sessionId) return;
    
    NSDictionary *statsDict = @{
        @"bitrate": @(videoStats.bitrate),
        @"fps": @(videoStats.fps),
        @"width": @(videoStats.width),
        @"height": @(videoStats.height),
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

@end
