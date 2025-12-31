#import <UIKit/UIKit.h>
#import <React/RCTViewManager.h>

@interface IVSPreviewView : UIView

@property(nonatomic, copy) NSString *sessionId;
@property(nonatomic, copy) NSString *aspectMode;
@property(nonatomic, assign) BOOL isMirrored;

- (void)refreshPreview;

@end

@interface IVSPreviewViewManager : RCTViewManager

@end
