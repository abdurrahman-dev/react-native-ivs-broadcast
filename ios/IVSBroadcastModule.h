#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <AmazonIVSBroadcast/AmazonIVSBroadcast.h>

@interface IVSBroadcastModule : RCTEventEmitter <RCTBridgeModule>

+ (instancetype)sharedInstance;
- (IVSBroadcastSession *)sessionForId:(NSString *)sessionId;

@end
