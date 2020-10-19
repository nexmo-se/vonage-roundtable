OTLayout = (layoutContainer) => {
  const layoutDimensions = [
    { width: '100%', height: '100%' },  // 0 speakers, 1x1
    { width: '100%', height: '100%' },  // 1 speakers, 1x1
    { width: '50%', height: '100%' },  // 2 speakers, 2x1
    { width: '33.333%', height: '100%' },  // 3 speakers, 3x1
    { width: '50%', height: '50%' },  // 4 speakers, 2x2
    { width: '33.333%', height: '50%' },  // 5 speakers, 3x2
    { width: '33.333%', height: '50%' },  // 6 speakers, 3x2
    { width: '25%', height: '50%' },  // 7 speakers, 4x2
    { width: '25%', height: '50%' },  // 8 speakers, 4x2
    { width: '33.333%', height: '33.333%' },  // 9 speakers, 3x3
    { width: '25%', height: '33.333%' },  // 10 speakers, 4x3
    { width: '25%', height: '33.333%' },  // 11 speakers, 4x3
    { width: '25%', height: '33.333%' },  // 12 speakers, 4x3
    { width: '25%', height: '25%' },  // 13 speakers, 4x4
    { width: '25%', height: '25%' },  // 14 speakers, 4x4
    { width: '25%', height: '25%' },  // 15 speakers, 4x4
    { width: '25%', height: '25%' },  // 16 speakers, 4x4
    { width: '20%', height: '25%' },  // 17 speakers, 5x4
    { width: '20%', height: '25%' },  // 18 speakers, 5x4
    { width: '20%', height: '25%' },  // 19 speakers, 5x4
    { width: '20%', height: '25%' },  // 20 speakers, 5x4
  ];
  const border = '10px solid #C53994';

  const layoutContainerElement = layoutContainer;
  layoutContainerElement.style.display = 'flex';
  layoutContainerElement.style['flex-direction'] = 'row';
  layoutContainerElement.style['flex-wrap'] = 'wrap';
  layoutContainerElement.style['justify-content'] = 'center';
  layoutContainerElement.style['align-items'] = 'center';

  let mostActiveSpeakerId = null;
  let highlightEnabled = true;

  const adjustHighlight = () => {
    const childNodes = layoutContainerElement.childNodes;
    for (let i = 0; i < childNodes.length; i += 1) {
      const childNode = childNodes[i];

      // Remove border from everyone
      childNode.style.border = null;

      // Add border to most active speaker
      if (highlightEnabled && childNode.id === mostActiveSpeakerId) {
        childNode.style.border = border;
      }
    }
  }

  const enableHighlight = (enabled) => {
    highlightEnabled = enabled;
    adjustHighlight();
  }

  const updateHighlight = (speakerId) => {
    mostActiveSpeakerId = speakerId;
    adjustHighlight();
  }

  const adjustLayout = (positions, numberOfActiveSpeakers = 2) => {
    // Hide All
    const children = [];
    const childNodes = layoutContainerElement.childNodes;
    for (let i = 0; i < childNodes.length; i += 1) {
      const childNode = childNodes[i];
      childNode.setAttribute('style', 'display: none;');
      childNode.style.display = 'none';
      childNode.style.border = null;

      children.push({ id: childNode.id, node: childNode, filled: false });
    }
    

    // Fill children into position
    const positionedChildren = [];
    const numberOfStreams = Math.min(numberOfActiveSpeakers, positions.length);
    const layoutDimension = layoutDimensions[numberOfStreams];

    for (let i = 0; i < positions.length; i += 1) {
      const speakerId = positions[i];
      for (let j = 0; j < children.length; j += 1) {
        if (children[j].id === speakerId) {
          // Update Style
          children[j].node.setAttribute('style', `display: flex; width: ${layoutDimension.width}; height: ${layoutDimension.height}`);
          children[j].node.style.display = 'flex';
          children[j].node.style.width = layoutDimensions.width;
          children[j].node.style.height = layoutDimension.height;

          // Fill into position
          positionedChildren.push(children[j]);

          // Mark as filled
          children[j].filled = true;
          break;
        }
      }
    }

    // Fill remaining children
    const remainingChildren = children.filter(child => !child.filled);
    for (let i = 0; i < remainingChildren.length; i += 1) {
      positionedChildren.push(remainingChildren[i]);
    }

    // Add back to layout container
    layoutContainerElement.innerHTML = '';
    for (let i = 0; i < positionedChildren.length; i += 1) {
      layoutContainerElement.appendChild(positionedChildren[i].node);
    }

    // Adjust Highlight
    adjustHighlight();
  };

  return {
    adjustLayout,
    updateHighlight,
    enableHighlight,
  };
};
