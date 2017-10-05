import React, {
  Component,
  cloneElement,
  createElement,
  isValidElement
} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  PanResponder,
  Animated,
  Easing
} from 'react-native';
import PropTypes from 'prop-types';
import isPromise from 'is-promise';

import Indicator from './Indicator';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexGrow: 1,
    zIndex: -999,
  },
});

const isPullingDown = (x, y) => y > 0 && (y > Math.abs(x));
const isPullingUp = (x, y) => y < 0 && (Math.abs(x) < Math.abs(y));
const isVerticalGesture = (x, y) => (Math.abs(x) < Math.abs(y));

export default class RefreshableFlatList extends Component {
  static propTypes = {
    minPullDownDistance: PropTypes.number,
    minPullUpDistance: PropTypes.number,
    scrollEventThrottle: PropTypes.number,
    onRefreshing: PropTypes.func,
    onLoadMore: PropTypes.func,
    minDisplayTime: PropTypes.number,
    onScroll: PropTypes.func,
    showTopIndicator: PropTypes.bool,
    showBottomIndicator: PropTypes.bool,
    topIndicatorComponent: PropTypes.oneOfType([PropTypes.func, PropTypes.element]),
    bottomIndicatorComponent: PropTypes.oneOfType([PropTypes.func, PropTypes.element]),
    topPullingIndicator: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    topHoldingIndicator: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    topRefreshingIndicator: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    bottomPullingIndicator: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    bottomHoldingIndicator: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    bottomRefreshingIndicator: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    topPullingPrompt: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    topHoldingPrompt: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    topRefreshingPrompt: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    bottomPullingPrompt: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    bottomHoldingPrompt: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    bottomRefreshingPrompt: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    styles: PropTypes.object,
  }

  static defaultProps = {
    minPullDownDistance: 54,
    minPullUpDistance: 54,
    scrollEventThrottle: 16,
    minDisplayTime: 300,
    showTopIndicator: true,
    showBottomIndicator: true,
    topIndicatorComponent: Indicator,
    bottomIndicatorComponent: Indicator,
    onScroll: () => {},
    onRefreshing: () => {},
    onLoadMore: () => {},
    topPullingIndicator: '',
    topHoldingIndicator: '',
    topRefreshingIndicator: '',
    bottomPullingIndicator: '',
    bottomHoldingIndicator: '',
    bottomRefreshingIndicator: '',
    topPullingPrompt: 'pull down to refresh',
    topHoldingPrompt: 'will refresh',
    topRefreshingPrompt: 'refreshing...',
    bottomPullingPrompt: 'pull up to load more',
    bottomHoldingPrompt: 'will load more',
    bottomRefreshingPrompt: 'loading...',
    styles: {}
  }

  constructor(props) {
    super(props);
    this.state = {
      refreshing: false,
      scrollStatus: 'NOT_EXCEEDED_MIN_PULL_DOWN_DISTANCE',
      flatListHeight: 0,
      contentHeight: 0,
      pullPan: new Animated.ValueXY({ x: 0, y: -54 }),
      width: 0,
      height: 0,
      scrollEnabled: false,
    };
    this.showBottomIndicator = this.props.showBottomIndicator;
    this.showTopIndicator = this.props.showTopIndicator;
    this.lastY = 0;
    this.contentOffset = 100;
  }

  componentWillMount() {
    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: this.onShouldSetPanResponder,
      onMoveShouldSetPanResponder: this.onShouldSetPanResponder,
      onPanResponderGrant: () => {},
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: this.onPanResponderMove,
      onPanResponderRelease: this.onPanResponderRelease,
      onPanResponderTerminate: this.onPanResponderRelease,
    });
  }

  onShouldSetPanResponder = (e, gesture) => {
    if (!isVerticalGesture(gesture.dx, gesture.dy)) {
      return false;
    }

    if (!this.state.scrollEnabled) {
      // eslint-disable-next-line
      this.offsetY = this.state.pullPan.y._value;
      return true;
    }

    return false;
  }

  onPanResponderMove = (e, gesture) => {
    const contentOffset = this.state.contentHeight - this.state.flatListHeight;
    if (isPullingDown(gesture.dx, gesture.dy)) {
      if (this.lastY + (gesture.dy / 2) >= contentOffset && contentOffset > 0) {
        this.flatList.scrollToOffset({
          offset: this.contentOffset - (gesture.dy / 2)
        });
      } else {
        this.state.pullPan.setValue({ x: 0, y: this.offsetY + (gesture.dy / 2) });
        if (gesture.dy / 2 < this.props.minPullDownDistance) {
          this.setState({
            scrollStatus: 'NOT_EXCEEDED_MIN_PULL_DOWN_DISTANCE',
            scrollPosition: -(gesture.dy / 2)
          });
        } else {
          this.setState({
            scrollStatus: 'EXCEEDED_MIN_PULL_DOWN_DISTANCE',
            scrollPosition: -(gesture.dy / 2)
          });
        }
        this.isPulling = true;
      }
    } else if (isPullingUp(gesture.dx, gesture.dy)) {
      if (this.lastY < contentOffset) {
        this.flatList.scrollToOffset({
          offset: gesture.dy * -1
        });
      } else {
        this.state.pullPan.setValue({ x: 0, y: this.offsetY + (gesture.dy / 2) });
        let scrollPosition = Math.abs(gesture.dy / 2) + this.contentOffset;

        if (contentOffset < 0) {
          scrollPosition = this.state.contentHeight - Math.abs(gesture.dy / 2);
        }

        if (Math.abs(gesture.dy / 2) > this.props.minPullUpDistance) {
          this.setState({
            scrollStatus: 'EXCEEDED_MIN_PULL_UP_DISTANCE',
            scrollPosition
          });
        } else {
          this.setState({
            scrollStatus: 'NOT_EXCEEDED_MIN_PULL_UP_DISTANCE',
            scrollPosition
          });
        }
      }
    }
  }

  onPanResponderRelease = () => {
    const delay = time => new Promise(resolve => setTimeout(resolve, time));
    const { showTopIndicator, showBottomIndicator } = this.props;
    const { scrollStatus } = this.state;

    if ((showTopIndicator && scrollStatus === 'EXCEEDED_MIN_PULL_DOWN_DISTANCE')
      || (showBottomIndicator && scrollStatus === 'EXCEEDED_MIN_PULL_UP_DISTANCE')) {
      let rerestScrollStatus = 'NOT_EXCEEDED_MIN_PULL_DOWN_DISTANCE';
      let toValue = { x: 0, y: 0 };
      let action = 'onRefreshing';

      if (scrollStatus.indexOf('UP') > -1) {
        toValue = { x: 0, y: -(this.props.minPullDownDistance + this.props.minPullDownDistance) };
        rerestScrollStatus = 'NOT_EXCEEDED_MIN_PULL_UP_DISTANCE';
        action = 'onLoadMore';
      }

      Animated.timing(this.state.pullPan, {
        toValue,
        easing: Easing.linear,
        duration: 300
      }).start();

      let loadingDataPromise = new Promise((resolve) => {
        const loadDataReturnValue = this.props[action](resolve);

        if (isPromise(loadDataReturnValue)) {
          loadingDataPromise = loadDataReturnValue;
        }

        Promise.all([
          loadingDataPromise,
          new Promise(r => this.setState({ refreshing: true }, r)),
          delay(this.props.minDisplayTime),
        ])
          .then(() => {
            Animated.timing(this.state.pullPan, {
              toValue: { x: 0, y: -this.props.minPullDownDistance },
              easing: Easing.linear,
              duration: 300
            }).start();

            this.setState({
              refreshing: false,
              scrollStatus: rerestScrollStatus,
            });
            this.isPulling = false;
          });
      });
    } else if ((showTopIndicator && scrollStatus === 'NOT_EXCEEDED_MIN_PULL_DOWN_DISTANCE')
      || (showBottomIndicator && scrollStatus === 'NOT_EXCEEDED_MIN_PULL_UP_DISTANCE')) {
      this.state.pullPan.setValue({ x: 0, y: -this.props.minPullDownDistance });
      this.isPulling = false;
    } else {
      this.state.pullPan.setValue({ x: 0, y: -this.props.minPullDownDistance });
      this.isPulling = false;
    }

    if (scrollStatus.indexOf('UP') > -1) {
      this.flatList.scrollToOffset({ offset: this.contentOffset - 1 });
    }
  }

  onScroll = (e) => {
    this.contentOffset = this.state.contentHeight - this.state.flatListHeight;
    this.lastY = e.nativeEvent.contentOffset.y + e.nativeEvent.contentInset.top;
    this.setState({ offsetY: this.lastY });

    if (this.lastY <= 0 || this.lastY >= this.contentOffset) {
      this.setState({ scrollEnabled: false });
    } else if (!this.isPulling) {
      this.setState({ scrollEnabled: true });
    }
  }

  onLayout = (e) => {
    if (this.state.width !== e.nativeEvent.layout.width || this.state.height !== e.nativeEvent.layout.height) {
      if (this.scrollContainer) {
        this.scrollContainer.setNativeProps({
          style: {
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height
          }
        });
      }

      this.setState({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
    }
  }

  renderIndicator(indicator) {
    if (!this.props.showTopIndicator && this.state.scrollStatus.indexOf('DOWN') > -1) {
      return null;
    } else if (!this.props.showBottomIndicator && this.state.scrollStatus.indexOf('UP') > -1) {
      return null;
    }

    const {
      topPullingIndicator,
      topHoldingIndicator,
      topRefreshingIndicator,
      bottomPullingIndicator,
      bottomHoldingIndicator,
      bottomRefreshingIndicator,
      topPullingPrompt,
      topHoldingPrompt,
      topRefreshingPrompt,
      bottomPullingPrompt,
      bottomHoldingPrompt,
      bottomRefreshingPrompt,
      styles
    } = this.props;
    const refreshingIndicatorProps = {
      topPullingIndicator,
      topHoldingIndicator,
      topRefreshingIndicator,
      bottomPullingIndicator,
      bottomHoldingIndicator,
      bottomRefreshingIndicator,
      topPullingPrompt,
      topHoldingPrompt,
      topRefreshingPrompt,
      bottomPullingPrompt,
      bottomHoldingPrompt,
      bottomRefreshingPrompt,
      styles,
      refreshing: this.state.refreshing,
      scrollPosition: this.state.offsetY,
      scrollStatus: this.state.scrollStatus
    };

    if (isValidElement(indicator)) {
      return cloneElement(indicator, refreshingIndicatorProps);
    }

    return createElement(indicator, refreshingIndicatorProps);
  }

  render() {
    const IndicatorWrapperStyle = {
      height: 54,
      justifyContent: 'flex-end',
    };

    return (
      <View style={[styles.container, this.props.style]} onLayout={this.onLayout}>
        <Animated.View ref={(c) => { this.ani = c; }} style={[this.state.pullPan.getLayout()]}>
          <View style={IndicatorWrapperStyle}>
            {this.renderIndicator(this.props.topIndicatorComponent)}
          </View>
          <View
            ref={(c) => { this.scrollContainer = c; }}
            {...this.panResponder.panHandlers}
            style={{ width: this.state.width, height: this.state.height }}
          >
            <FlatList
              {...this.props}
              ref={(ref) => { this.flatList = ref; }}
              scrollEnabled={this.state.scrollEnabled}
              onScroll={this.onScroll}
              onContentSizeChange={(w, h) => this.setState({ contentHeight: h })}
              onLayout={e => this.setState({ flatListHeight: e.nativeEvent.layout.height })}
            />
          </View>
          <View style={IndicatorWrapperStyle}>
            {this.renderIndicator(this.props.bottomIndicatorComponent)}
          </View>
        </Animated.View>
      </View>
    );
  }
}
