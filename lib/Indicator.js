import React, { Component, isValidElement, createElement } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
  indicatorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    height: 54,
  },
  indicator: {
    width: 24,
    height: 24,
    marginRight: 15,
    resizeMode: 'cover',
  },
  prompt: {
    color: '#6e6e6e',
    fontSize: 14
  }
});

export default class Indicator extends Component {
  static propTypes = {
    refreshing: PropTypes.bool.isRequired,
    scrollStatus: PropTypes.oneOf([
      'NOT_EXCEEDED_MIN_PULL_DOWN_DISTANCE',
      'NOT_EXCEEDED_MIN_PULL_UP_DISTANCE',
      'EXCEEDED_MIN_PULL_DOWN_DISTANCE',
      'EXCEEDED_MIN_PULL_UP_DISTANCE'
    ]).isRequired,
    styles: PropTypes.object.isRequired,
    topPullingIndicator: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    topHoldingIndicator: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    topRefreshingIndicator: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    bottomPullingIndicator: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    bottomHoldingIndicator: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    bottomRefreshingIndicator: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    topPullingPrompt: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    topHoldingPrompt: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    topRefreshingPrompt: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    bottomPullingPrompt: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    bottomHoldingPrompt: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    bottomRefreshingPrompt: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
  }

  renderIndicatorIcon() {
    let indicator;

    if (this.props.refreshing && this.props.scrollStatus === 'EXCEEDED_MIN_PULL_DOWN_DISTANCE') {
      indicator = this.props.topRefreshingIndicator;
    } else if (this.props.refreshing && this.props.scrollStatus === 'EXCEEDED_MIN_PULL_DOWN_DISTANCE') {
      indicator = this.props.bottomRefreshingIndicator;
    } else if (this.props.scrollStatus === 'EXCEEDED_MIN_PULL_DOWN_DISTANCE') {
      indicator = this.props.topHoldingIndicator;
    } else if (this.props.scrollStatus === 'EXCEEDED_MIN_PULL_UP_DISTANCE') {
      indicator = this.props.bottomHoldingIndicator;
    } else if (this.props.scrollStatus === 'NOT_EXCEEDED_MIN_PULL_UP_DISTANCE') {
      indicator = this.props.bottomPullingIndicator;
    } else if (this.props.scrollStatus === 'NOT_EXCEEDED_MIN_PULL_DOWN_DISTANCE') {
      indicator = this.props.topPullingIndicator;
    }

    if (indicator) {
      if (isValidElement(indicator)) return indicator;
      // is a component class, not an element
      return createElement(indicator, { style: [styles.indicator, this.props.styles.indicator] });
    }

    return null;
  }

  renderPrompt() {
    if (this.props.refreshing && this.props.scrollStatus === 'EXCEEDED_MIN_PULL_DOWN_DISTANCE') {
      return this.props.topRefreshingPrompt;
    } else if (this.props.refreshing && this.props.scrollStatus === 'EXCEEDED_MIN_PULL_UP_DISTANCE') {
      return this.props.bottomRefreshingPrompt;
    } else if (this.props.scrollStatus === 'EXCEEDED_MIN_PULL_DOWN_DISTANCE') {
      return this.props.topHoldingPrompt;
    } else if (this.props.scrollStatus === 'EXCEEDED_MIN_PULL_UP_DISTANCE') {
      return this.props.bottomHoldingPrompt;
    } else if (this.props.scrollStatus === 'NOT_EXCEEDED_MIN_PULL_UP_DISTANCE') {
      return this.props.bottomPullingPrompt;
    } else if (this.props.scrollStatus === 'NOT_EXCEEDED_MIN_PULL_DOWN_DISTANCE') {
      return this.props.topPullingPrompt;
    }

    return null;
  }

  render() {
    return (
      <View style={[styles.indicatorContainer, this.props.styles.container]}>
        {this.renderIndicatorIcon()}
        <Text style={[styles.prompt, this.props.styles.prompt]}>{this.renderPrompt()}</Text>
      </View>
    );
  }
}
