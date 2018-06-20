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
} from 'react-native';
import PropTypes from 'prop-types';
import isPromise from 'is-promise';

import Indicator from './Indicator';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexGrow: 1,
    position: 'relative'
  },
  fillParent: {
    backgroundColor: 'transparent',
    position: 'absolute',
    // flex: 1,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0
  },
});

export default class RefreshableFlatList extends Component {
  static propTypes = {
    minPullDownDistance: PropTypes.number,
    minPullUpDistance: PropTypes.number,
    scrollEventThrottle: PropTypes.number,
    onRefreshing: PropTypes.func,
    onLoadMore: PropTypes.func,
    minDisplayTime: PropTypes.number,
    overflowHeight: PropTypes.number,
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
    overflowHeight: 0,
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
      offsetY: 0,
      scrollStatus: 'NOT_EXCEEDED_MIN_PULL_DOWN_DISTANCE',
      flatListHeight: 0,
      contentHeight: 0,
      width: 0,
      height: 0,
    };
    this.contentOffset = -1;
  }

  onRelease = () => {
    // Code inspired by
    // react-native-refreshable-listview
    // https://github.com/jsdf/react-native-refreshable-listview/blob/master/lib/RefreshableListView.js#L42
    const delay = time => new Promise(resolve => setTimeout(resolve, time));
    const { showTopIndicator, showBottomIndicator } = this.props;
    const { scrollStatus } = this.state;

    if ((showTopIndicator && scrollStatus === 'EXCEEDED_MIN_PULL_DOWN_DISTANCE')
      || (showBottomIndicator && scrollStatus === 'EXCEEDED_MIN_PULL_UP_DISTANCE')) {
      let rerestScrollStatus = 'NOT_EXCEEDED_MIN_PULL_DOWN_DISTANCE';
      let offset = -this.props.minPullDownDistance;
      let action = 'onRefreshing';
      let resetOffset = 0;

      if (scrollStatus.indexOf('UP') > -1) {
        offset = this.contentOffset + this.props.minPullUpDistance;
        resetOffset = this.contentOffset;

        if (this.contentOffset < 0) {
          offset = this.props.minPullUpDistance;
          resetOffset = 0;
        }

        rerestScrollStatus = 'NOT_EXCEEDED_MIN_PULL_UP_DISTANCE';
        action = 'onLoadMore';
      }

      this.flatList.scrollToOffset({ offset });

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
            this.flatList.scrollToOffset({ animated: true, offset: resetOffset });
            this.setState({
              refreshing: false,
              scrollStatus: rerestScrollStatus,
            });
          });
      });
    }
  }

  onScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y + event.nativeEvent.contentInset.top;
    const contentOffset = this.state.contentHeight - this.state.flatListHeight;
    this.contentOffset = contentOffset;

    if (!this.state.refreshing) {
      if (offsetY < -this.props.minPullDownDistance) {
        this.setState({
          offsetY,
          scrollStatus: 'EXCEEDED_MIN_PULL_DOWN_DISTANCE',
        });
      } else if ((contentOffset > 0 && offsetY >= contentOffset + this.props.minPullUpDistance)
      || (contentOffset < 0 && offsetY >= this.props.minPullUpDistance && offsetY > 0)) {
        this.setState({
          offsetY,
          scrollStatus: 'EXCEEDED_MIN_PULL_UP_DISTANCE',
        });
      } else if (offsetY < 0 && offsetY > -this.props.minPullDownDistance) {
        this.setState({
          offsetY,
          scrollStatus: 'NOT_EXCEEDED_MIN_PULL_DOWN_DISTANCE',
        });
      } else if ((contentOffset > 0 && offsetY > contentOffset
          && offsetY < contentOffset + this.props.minPullUpDistance)
        || (contentOffset < 0 && offsetY > 0 && offsetY < this.props.minPullUpDistance)) {
        this.setState({
          offsetY,
          scrollStatus: 'NOT_EXCEEDED_MIN_PULL_UP_DISTANCE',
        });
      } else {
        this.setState({ offsetY });
      }
    }

    this.props.onScroll(event);
  }

  onLayout = (e) => {
    if (this.state.width !== e.nativeEvent.layout.width || this.state.height !== e.nativeEvent.layout.height) {
      if (this.scrollContainer) {
        this.scrollContainer.setNativeProps({
          style: {
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height + this.props.overflowHeight
          }
        });
      }

      this.setState({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height + this.props.overflowHeight });
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
    const TopIndicatorWrapperStyle = {
      transform: [{
        translateY: -(this.state.offsetY + this.props.minPullDownDistance)
      }]
    };
    const BottomIndicatorWrapperStyle = {
      transform: [{
        translateY: this.state.contentHeight - this.state.offsetY - this.props.minPullUpDistance
      }],
      // zIndex: -10,
    };

    if (this.contentOffset < 0) {
      BottomIndicatorWrapperStyle.transform = [{
        translateY: this.state.flatListHeight - this.state.offsetY - this.props.minPullUpDistance
      }];
    }

    return (
      <View style={[styles.container, this.props.style]} onLayout={this.onLayout}>
        <View style={TopIndicatorWrapperStyle}>
          {this.renderIndicator(this.props.topIndicatorComponent)}
        </View>
        <View
          ref={(ref) => { this.scrollContainer = ref; }}
          style={[styles.fillParent, { width: this.state.width, height: this.state.height }]}
        >
          <FlatList
            {...this.props}
            ref={(ref) => { this.flatList = ref; }}
            onScroll={this.onScroll}
            onResponderRelease={this.onRelease}
            onContentSizeChange={(w, h) => this.setState({ contentHeight: h })}
            onLayout={e => this.setState({ flatListHeight: e.nativeEvent.layout.height })}
          />
        </View>
        <View style={BottomIndicatorWrapperStyle}>
          {this.renderIndicator(this.props.bottomIndicatorComponent)}
        </View>
      </View>
    );
  }
}
