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
  },
  fillParent: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
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
    onScroll: PropTypes.func,
    showTopIndicator: PropTypes.bool,
    showBottomIndicator: PropTypes.bool,
    indicatorComponent: PropTypes.oneOfType([PropTypes.func, PropTypes.element]),
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
    indicatorComponent: Indicator,
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
      readyToRefresh: false,
      offsetY: 0,
      scrollStatus: 'NOT_EXCEEDED_MIN_PULL_DOWN_DISTANCE',
      flatListHeight: 0,
      contentHeight: 0,
    };
  }

  onRelease() {
    // Code inspired by
    // react-native-refreshable-listview
    // https://github.com/jsdf/react-native-refreshable-listview/blob/master/lib/RefreshableListView.js#L42
    if (!this.state.readyToRefresh) return;

    const delay = time => new Promise(resolve => setTimeout(resolve, time));
    const contentOffset = this.state.contentHeight - this.state.flatListHeight;

    if (this.state.readyToRefresh && this.state.scrollStatus === 'EXCEEDED_MIN_PULL_DOWN_DISTANCE') {
      this.flatList.scrollToOffset({ animated: true, offset: -this.props.minPullDownDistance });

      let loadingDataPromise = new Promise((resolve) => {
        const loadDataReturnValue = this.props.onRefreshing(resolve);

        if (isPromise(loadDataReturnValue)) {
          loadingDataPromise = loadDataReturnValue;
        }

        Promise.all([
          loadingDataPromise,
          new Promise(r => this.setState({ refreshing: true }, r)),
          delay(this.props.minDisplayTime),
        ])
          .then(() => {
            this.flatList.scrollToOffset({ animated: true, offset: 0 });
            this.setState({
              refreshing: false,
              readyToRefresh: false,
              scrollStatus: 'NOT_EXCEEDED_MIN_PULL_DOWN_DISTANCE',
            });
          });
      });
    } else if (this.state.readyToRefresh && this.state.scrollStatus === 'EXCEEDED_MIN_PULL_UP_DISTANCE') {
      this.flatList.scrollToOffset({
        animated: true,
        offset: contentOffset + this.props.minPullUpDistance
      });

      let loadingDataPromise = new Promise((resolve) => {
        const loadDataReturnValue = this.props.onLoadMore(resolve);

        if (isPromise(loadDataReturnValue)) {
          loadingDataPromise = loadDataReturnValue;
        }

        Promise.all([
          loadingDataPromise,
          new Promise(r => this.setState({ refreshing: true }, r)),
          delay(this.props.minDisplayTime),
        ])
          .then(() => {
            this.flatList.scrollToOffset({ animated: true, offset: contentOffset });
            this.setState({
              refreshing: false,
              readyToRefresh: false,
            });
          });
      });
    }
  }

  onScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y + event.nativeEvent.contentInset.top;
    const contentOffset = this.state.contentHeight - this.state.flatListHeight;

    if (offsetY < -this.props.minPullDownDistance) {
      this.setState({
        readyToRefresh: this.props.showTopIndicator,
        offsetY,
        scrollStatus: 'EXCEEDED_MIN_PULL_DOWN_DISTANCE',
      });
    } else if (offsetY >= contentOffset + this.props.minPullUpDistance) {
      this.setState({
        readyToRefresh: this.props.showBottomIndicator,
        offsetY,
        scrollStatus: 'EXCEEDED_MIN_PULL_UP_DISTANCE',
      });
    } else if (offsetY < 0 && offsetY > -this.props.minPullDownDistance) {
      this.setState({
        offsetY,
        scrollStatus: 'NOT_EXCEEDED_MIN_PULL_DOWN_DISTANCE',
      });
    } else if (offsetY > contentOffset
        && offsetY < contentOffset + this.props.minPullUpDistance) {
      this.setState({
        offsetY,
        scrollStatus: 'NOT_EXCEEDED_MIN_PULL_UP_DISTANCE',
      });
    } else {
      this.setState({ readyToRefresh: false, offsetY });
    }

    this.props.onScroll(event);
  }

  renderIndicator() {
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

    if (isValidElement(this.props.indicatorComponent)) {
      return cloneElement(this.props.indicatorComponent, refreshingIndicatorProps);
    }

    return createElement(this.props.indicatorComponent, refreshingIndicatorProps);
  }

  render() {
    const IndicatorWrapperStyle = {
      height: -this.state.offsetY,
      justifyContent: 'flex-end'
    };

    return (
      <View style={styles.container}>
        <View style={[styles.fillParent, IndicatorWrapperStyle]}>
          {this.renderIndicator()}
        </View>
        <View style={styles.fillParent}>
          <FlatList
            {...this.props}
            ref={(ref) => { this.flatList = ref; }}
            onScroll={this.onScroll}
            scrollEventThrottle={this.props.scrollEventThrottle}
            onResponderRelease={() => this.onRelease()}
            onContentSizeChange={(w, h) => { this.setState({ contentHeight: h }); }}
            onLayout={(e) => { this.setState({ flatListHeight: e.nativeEvent.layout.height }); }}
          />
        </View>
      </View>
    );
  }
}
