#import "IVSPreviewView.h"
#import "IVSBroadcastModule.h"
#import <AmazonIVSBroadcast/AmazonIVSBroadcast.h>

@interface IVSPreviewView ()
@property (nonatomic, strong) IVSImagePreviewView *previewView;
@property (nonatomic, weak) IVSImageDevice *imageDevice;
@end

@implementation IVSPreviewView

- (instancetype)initWithFrame:(CGRect)frame {
    self = [super initWithFrame:frame];
    if (self) {
        _aspectMode = @"fill";
        _isMirrored = YES;
        [self setupPreviewView];
        [self setupNotifications];
    }
    return self;
}

- (void)setupNotifications {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleCameraDeviceChanged:)
                                                 name:@"IVSCameraDeviceChanged"
                                               object:nil];
}

- (void)handleCameraDeviceChanged:(NSNotification *)notification {
    NSString *changedSessionId = notification.userInfo[@"sessionId"];
    if ([changedSessionId isEqualToString:self.sessionId]) {
        // Bu session'ın kamerası değişti, preview'ı güncelle
        dispatch_async(dispatch_get_main_queue(), ^{
            [self attachToSession];
        });
    }
}

- (void)dealloc {
    [[NSNotificationCenter defaultCenter] removeObserver:self];
    if (self.imageDevice) {
        [self.imageDevice setPreviewView:nil];
    }
}

- (void)setupPreviewView {
    _previewView = [[IVSImagePreviewView alloc] initWithFrame:self.bounds];
    _previewView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    _previewView.backgroundColor = [UIColor blackColor];
    _previewView.clipsToBounds = YES;
    [self addSubview:_previewView];
    self.clipsToBounds = YES;
}

- (void)layoutSubviews {
    [super layoutSubviews];
    self.previewView.frame = self.bounds;
}

- (void)setSessionId:(NSString *)sessionId {
    _sessionId = [sessionId copy];
    // Biraz gecikme ile attach et, session hazır olması için
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.1 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        [self attachToSession];
    });
}

- (void)setAspectMode:(NSString *)aspectMode {
    _aspectMode = [aspectMode copy];
    
    if ([aspectMode isEqualToString:@"fit"]) {
        self.previewView.contentMode = UIViewContentModeScaleAspectFit;
    } else if ([aspectMode isEqualToString:@"fill"]) {
        self.previewView.contentMode = UIViewContentModeScaleAspectFill;
    } else {
        self.previewView.contentMode = UIViewContentModeScaleAspectFill;
    }
}

- (void)setIsMirrored:(BOOL)isMirrored {
    _isMirrored = isMirrored;
    
    if (isMirrored) {
        self.previewView.transform = CGAffineTransformMakeScale(-1, 1);
    } else {
        self.previewView.transform = CGAffineTransformIdentity;
    }
}

- (void)attachToSession {
    if (!_sessionId || _sessionId.length == 0) {
        return;
    }
    
    // IVSBroadcastModule'den session al
    IVSBroadcastModule *module = [IVSBroadcastModule sharedInstance];
    if (!module) {
        // Retry after delay
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [self attachToSession];
        });
        return;
    }
    
    IVSBroadcastSession *session = [module sessionForId:_sessionId];
    if (!session) {
        // Session henüz hazır değilse tekrar dene
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [self attachToSession];
        });
        return;
    }
    
    // Önceki preview'ı temizle
    if (self.imageDevice) {
        [self.imageDevice setPreviewView:nil];
        self.imageDevice = nil;
    }
    
    // Session'dan kamera device'ını al
    NSArray<IVSDevice *> *attachedDevices = [session listAttachedDevices];
    for (IVSDevice *device in attachedDevices) {
        if (device.descriptor.type == IVSDeviceTypeCamera) {
            if ([device isKindOfClass:[IVSImageDevice class]]) {
                IVSImageDevice *imageDevice = (IVSImageDevice *)device;
                self.imageDevice = imageDevice;
                [imageDevice setPreviewView:self.previewView];
                break;
            }
        }
    }
    
    // Eğer kamera bulunamadıysa, biraz bekleyip tekrar dene
    if (!self.imageDevice) {
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.3 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            [self attachToSession];
        });
    }
}

- (void)refreshPreview {
    [self attachToSession];
}

- (void)removeFromSuperview {
    if (self.imageDevice) {
        [self.imageDevice setPreviewView:nil];
        self.imageDevice = nil;
    }
    [super removeFromSuperview];
}


@end

#pragma mark - IVSPreviewViewManager

@implementation IVSPreviewViewManager

RCT_EXPORT_MODULE(IVSPreviewView)

- (UIView *)view {
    IVSPreviewView *view = [[IVSPreviewView alloc] init];
    return view;
}

RCT_EXPORT_VIEW_PROPERTY(sessionId, NSString)
RCT_EXPORT_VIEW_PROPERTY(aspectMode, NSString)
RCT_EXPORT_VIEW_PROPERTY(isMirrored, BOOL)

@end

