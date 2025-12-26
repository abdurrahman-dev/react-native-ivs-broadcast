#import "IVSBroadcastModule.h"
#import <AmazonIVSBroadcast/AmazonIVSBroadcast.h>

@interface IVSBroadcastModule () <IVSBroadcastSessionDelegate>
@property (nonatomic, strong) NSMutableDictionary<NSString *, IVSBroadcastSession *> *sessions;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSURL *> *sessionUrls;
@end

@implementation IVSBroadcastModule

RCT_EXPORT_MODULE();

- (instancetype)init {
    self = [super init];
    if (self) {
        _sessions = [NSMutableDictionary dictionary];
        _sessionUrls = [NSMutableDictionary dictionary];
    }
    return self;
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

RCT_EXPORT_METHOD(createSession:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSString *rtmpUrl = config[@"rtmpUrl"];
        if (!rtmpUrl) {
            reject(@"CREATE_SESSION_ERROR", @"rtmpUrl is required", nil);
            return;
        }
        
        NSString *streamKey = config[@"streamKey"];
        NSString *fullUrl = streamKey ? [NSString stringWithFormat:@"%@/%@", rtmpUrl, streamKey] : rtmpUrl;
        
        IVSBroadcastConfiguration *broadcastConfig = [[IVSBroadcastConfiguration alloc] init];
        
        // Video config
        NSDictionary *videoConfig = config[@"videoConfig"];
        if (videoConfig) {
            if (videoConfig[@"width"]) {
                broadcastConfig.videoConfig.width = [videoConfig[@"width"] intValue];
            }
            if (videoConfig[@"height"]) {
                broadcastConfig.videoConfig.height = [videoConfig[@"height"] intValue];
            }
            if (videoConfig[@"bitrate"]) {
                broadcastConfig.videoConfig.bitrate = [videoConfig[@"bitrate"] intValue];
            }
            if (videoConfig[@"fps"]) {
                broadcastConfig.videoConfig.targetFps = [videoConfig[@"fps"] intValue];
            }
            if (videoConfig[@"targetFps"]) {
                broadcastConfig.videoConfig.targetFps = [videoConfig[@"targetFps"] intValue];
            }
            if (videoConfig[@"keyframeInterval"]) {
                broadcastConfig.videoConfig.keyframeInterval = [videoConfig[@"keyframeInterval"] intValue];
            }
        }
        
        // Audio config
        NSDictionary *audioConfig = config[@"audioConfig"];
        if (audioConfig) {
            if (audioConfig[@"bitrate"]) {
                broadcastConfig.audioConfig.bitrate = [audioConfig[@"bitrate"] intValue];
            }
            if (audioConfig[@"sampleRate"]) {
                broadcastConfig.audioConfig.sampleRate = [audioConfig[@"sampleRate"] intValue];
            }
            if (audioConfig[@"channels"]) {
                broadcastConfig.audioConfig.channels = [audioConfig[@"channels"] intValue];
            }
        }
        
        IVSBroadcastSession *session = [[IVSBroadcastSession alloc] initWithConfiguration:broadcastConfig
                                                                                    delegate:self
                                                                                    error:nil];
        
        if (!session) {
            reject(@"CREATE_SESSION_ERROR", @"Failed to create broadcast session", nil);
            return;
        }
        
        NSString *sessionId = [[NSUUID UUID] UUIDString];
        self.sessions[sessionId] = session;
        self.sessionUrls[sessionId] = [NSURL URLWithString:fullUrl];
        
        resolve(sessionId);
    } @catch (NSException *exception) {
        reject(@"CREATE_SESSION_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(startBroadcast:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
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
        BOOL success = [session startWithURL:url error:&error];
        
        if (!success) {
            reject(@"START_BROADCAST_ERROR", error.localizedDescription, error);
            return;
        }
        
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"START_BROADCAST_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(stopBroadcast:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
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
}

RCT_EXPORT_METHOD(pauseBroadcast:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        IVSBroadcastSession *session = self.sessions[sessionId];
        if (!session) {
            reject(@"PAUSE_BROADCAST_ERROR", @"Session not found", nil);
            return;
        }
        
        [session pause];
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"PAUSE_BROADCAST_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(resumeBroadcast:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        IVSBroadcastSession *session = self.sessions[sessionId];
        if (!session) {
            reject(@"RESUME_BROADCAST_ERROR", @"Session not found", nil);
            return;
        }
        
        [session resume];
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"RESUME_BROADCAST_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(destroySession:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        IVSBroadcastSession *session = self.sessions[sessionId];
        if (!session) {
            reject(@"DESTROY_SESSION_ERROR", @"Session not found", nil);
            return;
        }
        
        [session stop];
        [self.sessions removeObjectForKey:sessionId];
        [self.sessionUrls removeObjectForKey:sessionId];
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"DESTROY_SESSION_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getState:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        IVSBroadcastSession *session = self.sessions[sessionId];
        if (!session) {
            reject(@"GET_STATE_ERROR", @"Session not found", nil);
            return;
        }
        
        NSDictionary *state = @{
            @"isBroadcasting": @(session.state == IVSBroadcastSessionStateConnected),
            @"isPaused": @(session.state == IVSBroadcastSessionStatePaused)
        };
        
        resolve(state);
    } @catch (NSException *exception) {
        reject(@"GET_STATE_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(switchCamera:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        IVSBroadcastSession *session = self.sessions[sessionId];
        if (!session) {
            reject(@"SWITCH_CAMERA_ERROR", @"Session not found", nil);
            return;
        }
        
        NSArray<IVSDeviceDescriptor *> *cameras = [session listAvailableDevices:IVSDeviceTypeCamera];
        if (cameras.count == 0) {
            reject(@"SWITCH_CAMERA_ERROR", @"No camera devices available", nil);
            return;
        }
        
        IVSDeviceDescriptor *currentCamera = [session listActiveDevices:IVSDeviceTypeCamera].firstObject;
        IVSDeviceDescriptor *newCamera = cameras.firstObject;
        
        for (IVSDeviceDescriptor *camera in cameras) {
            if (![camera.uid isEqualToString:currentCamera.uid]) {
                newCamera = camera;
                break;
            }
        }
        
        if (currentCamera) {
            [session replaceDevice:currentCamera withDevice:newCamera];
        } else {
            [session addDevice:newCamera];
        }
        
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"SWITCH_CAMERA_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(setCameraPosition:(NSString *)sessionId
                  position:(NSString *)position
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        IVSBroadcastSession *session = self.sessions[sessionId];
        if (!session) {
            reject(@"SET_CAMERA_POSITION_ERROR", @"Session not found", nil);
            return;
        }
        
        IVSDeviceType deviceType = [position isEqualToString:@"front"] 
            ? IVSDeviceTypeCameraFront 
            : IVSDeviceTypeCameraBack;
        
        NSArray<IVSDeviceDescriptor *> *cameras = [session listAvailableDevices:deviceType];
        if (cameras.count == 0) {
            reject(@"SET_CAMERA_POSITION_ERROR", 
                   [NSString stringWithFormat:@"Camera device not available: %@", position], nil);
            return;
        }
        
        IVSDeviceDescriptor *currentCamera = [session listActiveDevices:IVSDeviceTypeCamera].firstObject;
        IVSDeviceDescriptor *newCamera = cameras.firstObject;
        
        if (currentCamera) {
            [session replaceDevice:currentCamera withDevice:newCamera];
        } else {
            [session addDevice:newCamera];
        }
        
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"SET_CAMERA_POSITION_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(setMuted:(NSString *)sessionId
                  muted:(BOOL)muted
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        IVSBroadcastSession *session = self.sessions[sessionId];
        if (!session) {
            reject(@"SET_MUTED_ERROR", @"Session not found", nil);
            return;
        }
        
        IVSDeviceDescriptor *microphone = [session listActiveDevices:IVSDeviceTypeMicrophone].firstObject;
        if (microphone) {
            IVSMicrophoneDevice *micDevice = (IVSMicrophoneDevice *)[session deviceWithDescriptor:microphone];
            [micDevice setMuted:muted];
        }
        
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"SET_MUTED_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(isMuted:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        IVSBroadcastSession *session = self.sessions[sessionId];
        if (!session) {
            reject(@"IS_MUTED_ERROR", @"Session not found", nil);
            return;
        }
        
        IVSDeviceDescriptor *microphone = [session listActiveDevices:IVSDeviceTypeMicrophone].firstObject;
        BOOL muted = NO;
        if (microphone) {
            IVSMicrophoneDevice *micDevice = (IVSMicrophoneDevice *)[session deviceWithDescriptor:microphone];
            muted = micDevice.isMuted;
        }
        
        resolve(@(muted));
    } @catch (NSException *exception) {
        reject(@"IS_MUTED_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(updateVideoConfig:(NSString *)sessionId
                  config:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        IVSBroadcastSession *session = self.sessions[sessionId];
        if (!session) {
            reject(@"UPDATE_VIDEO_CONFIG_ERROR", @"Session not found", nil);
            return;
        }
        
        IVSBroadcastConfiguration *broadcastConfig = session.configuration;
        if (config[@"width"]) {
            broadcastConfig.videoConfig.width = [config[@"width"] intValue];
        }
        if (config[@"height"]) {
            broadcastConfig.videoConfig.height = [config[@"height"] intValue];
        }
        if (config[@"bitrate"]) {
            broadcastConfig.videoConfig.bitrate = [config[@"bitrate"] intValue];
        }
        if (config[@"fps"]) {
            broadcastConfig.videoConfig.targetFps = [config[@"fps"] intValue];
        }
        if (config[@"targetFps"]) {
            broadcastConfig.videoConfig.targetFps = [config[@"targetFps"] intValue];
        }
        if (config[@"keyframeInterval"]) {
            broadcastConfig.videoConfig.keyframeInterval = [config[@"keyframeInterval"] intValue];
        }
        
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"UPDATE_VIDEO_CONFIG_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(updateAudioConfig:(NSString *)sessionId
                  config:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        IVSBroadcastSession *session = self.sessions[sessionId];
        if (!session) {
            reject(@"UPDATE_AUDIO_CONFIG_ERROR", @"Session not found", nil);
            return;
        }
        
        IVSBroadcastConfiguration *broadcastConfig = session.configuration;
        if (config[@"bitrate"]) {
            broadcastConfig.audioConfig.bitrate = [config[@"bitrate"] intValue];
        }
        if (config[@"sampleRate"]) {
            broadcastConfig.audioConfig.sampleRate = [config[@"sampleRate"] intValue];
        }
        if (config[@"channels"]) {
            broadcastConfig.audioConfig.channels = [config[@"channels"] intValue];
        }
        
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"UPDATE_AUDIO_CONFIG_ERROR", exception.reason, nil);
    }
}

#pragma mark - IVSBroadcastSessionDelegate

- (void)broadcastSession:(IVSBroadcastSession *)session didChangeState:(IVSBroadcastSessionState)state {
    NSString *sessionId = [self sessionIdForSession:session];
    if (!sessionId) return;
    
    NSMutableDictionary *stateDict = [NSMutableDictionary dictionaryWithDictionary:@{
        @"isBroadcasting": @(state == IVSBroadcastSessionStateConnected),
        @"isPaused": @(state == IVSBroadcastSessionStatePaused)
    }];
    stateDict[@"sessionId"] = sessionId;
    
    [self sendEventWithName:@"onStateChanged" body:stateDict];
}

- (void)broadcastSession:(IVSBroadcastSession *)session didEmitError:(NSError *)error {
    NSString *sessionId = [self sessionIdForSession:session];
    if (!sessionId) return;
    
    NSMutableDictionary *errorDict = [NSMutableDictionary dictionaryWithDictionary:@{
        @"message": error.localizedDescription ?: @"Unknown error",
        @"code": @(error.code).stringValue
    }];
    errorDict[@"sessionId"] = sessionId;
    
    [self sendEventWithName:@"onError" body:errorDict];
}

- (void)broadcastSession:(IVSBroadcastSession *)session didEmitNetworkHealth:(IVSNetworkHealth *)health {
    NSString *sessionId = [self sessionIdForSession:session];
    if (!sessionId) return;
    
    NSString *quality = @"unknown";
    switch (health.networkQuality) {
        case IVSNetworkQualityExcellent:
            quality = @"excellent";
            break;
        case IVSNetworkQualityGood:
            quality = @"good";
            break;
        case IVSNetworkQualityFair:
            quality = @"fair";
            break;
        case IVSNetworkQualityPoor:
            quality = @"poor";
            break;
        default:
            break;
    }
    
    NSMutableDictionary *healthDict = [NSMutableDictionary dictionaryWithDictionary:@{
        @"networkQuality": quality,
        @"uplinkBandwidth": @(health.uplinkBandwidth),
        @"rtt": @(health.rtt)
    }];
    healthDict[@"sessionId"] = sessionId;
    
    [self sendEventWithName:@"onNetworkHealth" body:healthDict];
}

- (void)broadcastSession:(IVSBroadcastSession *)session didEmitAudioStats:(IVSAudioStats *)stats {
    NSString *sessionId = [self sessionIdForSession:session];
    if (!sessionId) return;
    
    NSMutableDictionary *statsDict = [NSMutableDictionary dictionaryWithDictionary:@{
        @"bitrate": @(stats.bitrate),
        @"sampleRate": @(stats.sampleRate),
        @"channels": @(stats.channels)
    }];
    statsDict[@"sessionId"] = sessionId;
    
    [self sendEventWithName:@"onAudioStats" body:statsDict];
}

- (void)broadcastSession:(IVSBroadcastSession *)session didEmitVideoStats:(IVSVideoStats *)stats {
    NSString *sessionId = [self sessionIdForSession:session];
    if (!sessionId) return;
    
    NSMutableDictionary *statsDict = [NSMutableDictionary dictionaryWithDictionary:@{
        @"bitrate": @(stats.bitrate),
        @"fps": @(stats.fps),
        @"width": @(stats.width),
        @"height": @(stats.height)
    }];
    statsDict[@"sessionId"] = sessionId;
    
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

