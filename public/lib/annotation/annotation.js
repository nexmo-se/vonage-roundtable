OTAnnotation = () => {
  const drawingStream = {};
  const drawingHistory = {};

  let drawListener = null;
  let clearListener = null;

  const canvases = {};
  const pubsubs = {};
  const colors = {};

  const setDrawListener = (listener) => {
    drawListener = listener;
  };

  const setClearListener = (listener) => {
    clearListener = listener;
  };

  const getCanvasDimensions = (containerDimensions, videoDimensions) => {
    const { width: videoWidth, height: videoHeight } = videoDimensions;
    const { width: containerWidth, height: containerHeight } = containerDimensions;

    // Aspect Ratio
    const containerAspectRatio = containerWidth / containerHeight;
    const videoAspectRatio = videoWidth / videoHeight;

    // Orientation
    const containerOrientation = containerAspectRatio > 0 ? 'landscape' : 'portrait';
    const videoOrientation = videoAspectRatio > 0 ? 'landscape' : 'portrait';

    let canvasWidth = containerWidth;
    let canvasHeight = containerHeight;

    if (videoAspectRatio > containerAspectRatio) {
      // Fit by Width, black bar on top and bottom
      canvasWidth = containerWidth;
      canvasHeight = containerWidth / videoAspectRatio;
    } else {
      // Fit by Height, black bar on left and right
      canvasWidth = containerHeight * videoAspectRatio;
      canvasHeight = containerHeight;
    }

    return {
      width: canvasWidth,
      height: canvasHeight,
    };
  }

  const getNormalizedCoordinate = (coordinate, canvasDimensions) => {
    // Get normalized (0.0 - 1.0) against dimension
    return {
      x: coordinate.x / canvasDimensions.width,
      y: coordinate.y / canvasDimensions.height,
    };
  };

  const getRelativeCoordinate = (coordinate, canvasDimensions) => {
    // Get relative (pixel) on dimension
    return {
      x: coordinate.x * canvasDimensions.width,
      y: coordinate.y * canvasDimensions.height,
    };
  };

  const getDrawCoordinate = (canvas, event) => {
    // Mouse
    const { clientX: eventX, clientY: eventY } = event;

    // Canvas
    const canvasRect = canvas.getBoundingClientRect();
    const { x: canvasX, y: canvasY } = canvasRect;

    return {
      x: eventX - canvasX,
      y: eventY - canvasY,
    };

  }

  const handleDrawStart = (name, canvas) => (e) => {
    console.log(`Draw Start - ${name}`);
    const coordinate = getDrawCoordinate(canvas, e);
    drawingStream[name] = coordinate;
  };

  const handleDrawMove = (name, canvas) => (e) => {
    if (drawingStream[name]) {
      const coordinate = getDrawCoordinate(canvas, e);

      const color = colors[name] || '#ff0000';

      // Draw
      draw(canvas, drawingStream[name], coordinate, color);

      // Canvas Dimenstions
      const canvasDimensions = canvas.getBoundingClientRect();

      // Get Normalized
      const normalizedPreviousCoordinate = getNormalizedCoordinate(drawingStream[name], canvasDimensions);
      const normalizedCurrentCoordinate = getNormalizedCoordinate(coordinate, canvasDimensions);

      // Stroke
      const stroke = {
        color,
        from: normalizedPreviousCoordinate,
        to: normalizedCurrentCoordinate,
      };

      // Add to History
      if (drawingHistory[name] == null) {
        drawingHistory[name] = [];
      }
      drawingHistory[name].push(stroke);

      // Send Stroke
      if (drawListener) {
        drawListener(name, stroke);
      }

      // Update Previous Coordinate
      drawingStream[name] = coordinate;
    }
  };

  const handleDrawEnd = (name, canvas) => (e) => {
    if (drawingStream[name]) {
      console.log(`Draw End - ${name}`);
      const coordinate = getDrawCoordinate(canvas, e);
      delete drawingStream[name];
    }
  };

  const handleMouseEnter = (name, canvas) => (e) => {
    console.log(`Mouse Enter - ${name}`);
  };

  const handleMouseLeave = (name, canvas) => (e) => {
    if (drawingStream[name]) {
      console.log(`Mouse Leave - ${name}`);
      const coordinate = getDrawCoordinate(canvas, e);
      delete drawingStream[name];
    }
  };

  const undoDrawing = (name, canvas) => {
    if (drawingHistory[name] && drawingHistory[name].length > 0) {
      drawingHistory[name] = drawingHistory[name].slice(0, drawingHistory[name].length - 1);
    }

    // Remove all current drawing
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Restore previous drawing
    refreshStrokes(name);
  };

  const clearDrawing = (name) => {
    const canvas = canvases[name];
    if (canvas == null) {
      console.error(`Canvas [${name}] does not exist`);
      return;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    delete drawingHistory[name];
  };

  const refreshStrokes = (name) => {
    const canvas = canvases[name];
    if (canvas == null) {
      console.error(`Canvas [${name}] does not exist`);
      return;
    }

    // Canvas Dimensions
    const canvasDimensions = canvas.getBoundingClientRect();

    const strokes = drawingHistory[name] || [];
    for (let i = 0; i < strokes.length; i += 1) {
      const stroke = strokes[i];

      // Get Normalized
      const fromCoordinate = getRelativeCoordinate(stroke.from, canvasDimensions);
      const toCoordinate = getRelativeCoordinate(stroke.to, canvasDimensions);

      // Get Color
      const color = stroke.color;

      // Draw
      draw(canvas, fromCoordinate, toCoordinate, color);
    };
  };

  const addStroke = (name, stroke) => {
    const canvas = canvases[name];
    if (canvas == null) {
      console.error(`Canvas [${name}] does not exist`);
      return;
    }

    // Canvas Dimensions
    const canvasDimensions = canvas.getBoundingClientRect();

    // Add to History
    if (drawingHistory[name] == null) {
      drawingHistory[name] = [];
    }
    drawingHistory[name].push(stroke);


    // Get Normalized
    const fromCoordinate = getRelativeCoordinate(stroke.from, canvasDimensions);
    const toCoordinate = getRelativeCoordinate(stroke.to, canvasDimensions);

    // Get Color
    const color = stroke.color;

    // Draw
    draw(canvas, fromCoordinate, toCoordinate, color);
  };

  const draw = (canvas, previousCoordinate, currentCoordinate, color) => {
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(previousCoordinate.x, previousCoordinate.y);
    ctx.lineTo(currentCoordinate.x, currentCoordinate.y);
    ctx.stroke();
    ctx.closePath();
  }

  const createColorOption = (displayName, value, selected = false) => {
    const option = document.createElement('option');
    option.value = value;
    option.innerText = displayName;
    option.selected = selected;
    option.style.color = '#000000';

    return option;
  };

  const createColorSelect = () => {
    const redOption = createColorOption('Red', '#ff0000', true);
    const greenOption = createColorOption('Green', '#00ff00', false);
    const blueOption = createColorOption('Blue', '#0000ff', false);
    const cyanOption = createColorOption('Cyan', '#00ffff', false);
    const magentaOption = createColorOption('Magenta', '#ff00ff', false);
    const yellowOption = createColorOption('Yellow', '#ffff00', false);
    const orangeOption = createColorOption('Orange', '#ff8000', false);
    const purpleOption = createColorOption('Purple', '#8000ff', false);
    const whiteOption = createColorOption('White', '#ffffff', false);
    const blackOption = createColorOption('Black', '#000000', false);

    const select = document.createElement('select');
    select.style.color = '#000000';
    select.style.height = 28;
    select.style.marginRight = 4;
    select.style.borderRadius = 4;

    select.appendChild(redOption);
    select.appendChild(greenOption);
    select.appendChild(blueOption);

    select.appendChild(cyanOption);
    select.appendChild(magentaOption);
    select.appendChild(yellowOption);

    select.appendChild(orangeOption);
    select.appendChild(purpleOption);

    select.appendChild(whiteOption);
    select.appendChild(blackOption);

    return select;
  };

  const addToolbar = (name, canvas) => {
    const toolbar = document.createElement('div');
    toolbar.id = `drawing-toolbar-${name}`;
    toolbar.style.position = 'absolute';
    toolbar.style.bottom = 0;
    toolbar.style.display = 'flex';
    toolbar.style.flexDirection = 'row';
    toolbar.style.alignItems = 'center';
    toolbar.style.justifyContent = 'start';

    // Undo
    // const undoButton = document.createElement('button');
    // undoButton.innerText = 'Undo';
    // undoButton.style.color = '#000000';
    // undoButton.style.marginRight = 4;
    // undoButton.style.padding = 4;
    // undoButton.style.borderRadius = 4;
    // undoButton.onclick = () => undoDrawing(name, canvas);

    // Clear
    const clearButton = document.createElement('button');
    clearButton.innerText = 'Clear';
    clearButton.style.color = '#000000';
    clearButton.style.marginRight = 4;
    clearButton.style.padding = 4;
    clearButton.style.borderRadius = 4;
    clearButton.onclick = () => {
      clearDrawing(name);
      clearListener && clearListener(name);
    };
    
    // Colour
    const colorSelect = createColorSelect();
    colorSelect.onchange = (e) => colors[name] = e.target.value;

    // toolbar.appendChild(undoButton);
    toolbar.appendChild(clearButton);
    toolbar.appendChild(colorSelect);

    console.log(canvas.parentNode);
    canvas.parentNode.appendChild(toolbar);

    return toolbar;
  }

  const startPublisher = (publisher) => {
    const publisherName = publisher && publisher.stream && publisher.stream.name || 'unknown';
    console.log(`Start Publisher Annotation - ${publisherName}`);

    // Video Dimensions
    const { videoDimensions } = publisher.stream;

    // Container Dimensions
    const domElement = publisher.element;
    const containerDimensions = domElement.getBoundingClientRect();

    // Canvas Dimensions
    const canvasDimensions = getCanvasDimensions(containerDimensions, videoDimensions);

    // Create Canvas
    const canvas = document.createElement('canvas');

    canvas.width = canvasDimensions.width;
    canvas.height = canvasDimensions.height;

    canvas.style.position = 'absolute';
    canvas.style.width = canvasDimensions.width;
    canvas.style.height = canvasDimensions.height;
    canvas.style.left = (containerDimensions.width - canvasDimensions.width) / 2;
    canvas.style.top = (containerDimensions.height - canvasDimensions.height) / 2;

    canvas.onmousedown = handleDrawStart(publisherName, canvas);
    canvas.onmouseup = handleDrawEnd(publisherName, canvas);
    canvas.onmousemove = handleDrawMove(publisherName, canvas);
    canvas.onmouseenter = handleMouseEnter(publisherName, canvas);
    canvas.onmouseleave = handleMouseLeave(publisherName, canvas);

    
    domElement.appendChild(canvas);
    addToolbar(publisherName, canvas);

    canvases[publisherName] = canvas;
    pubsubs[publisherName] = publisher;
  };

  const endPublisher = (publisher) => {
    console.log(`End Publisher Annotation`);

    const publisherName = publisher && publisher.stream && publisher.stream.name || 'unknown';
    if (publisherName) {
      delete canvases[publisherName];
      delete pubsubs[publisherName];
      delete drawingHistory[publisherName];
      delete drawingStream[publisherName];
    }
  };

  const startSubscriber = (subscriber) => {
    const subscriberName = subscriber && subscriber.stream && subscriber.stream.name || 'unknown';
    console.log(`Start Subscriber Annotation - ${subscriberName}`);

    // Video Dimensions
    const { videoDimensions } = subscriber.stream;

    // Container Dimensions
    const domElement = subscriber.element;
    const containerDimensions = domElement.getBoundingClientRect();

    // Canvas Dimensions
    const canvasDimensions = getCanvasDimensions(containerDimensions, videoDimensions);

    // Create Canvas
    const canvas = document.createElement('canvas');

    canvas.width = canvasDimensions.width;
    canvas.height = canvasDimensions.height;

    canvas.style.position = 'absolute';
    canvas.style.width = canvasDimensions.width;
    canvas.style.height = canvasDimensions.height;
    canvas.style.left = (containerDimensions.width - canvasDimensions.width) / 2;
    canvas.style.top = (containerDimensions.height - canvasDimensions.height) / 2;

    canvas.onmousedown = handleDrawStart(subscriberName, canvas);
    canvas.onmouseup = handleDrawEnd(subscriberName, canvas);
    canvas.onmousemove = handleDrawMove(subscriberName, canvas);
    canvas.onmouseenter = handleMouseEnter(subscriberName, canvas);
    canvas.onmouseleave = handleMouseLeave(subscriberName, canvas);


    domElement.appendChild(canvas);
    addToolbar(subscriberName, canvas);

    canvases[subscriberName] = canvas;
    pubsubs[subscriberName] = subscriber;
  };

  const endSubscriber = (subscriber) => {
    console.log(`End Subscriber Annotation`);

    const subscriberName = subscriber && subscriber.stream && subscriber.stream.name || 'unknown';
    if (subscriberName) {
      delete canvases[subscriberName];
      delete pubsubs[subscriberName];
      delete drawingHistory[subscriberName];
      delete drawingStream[subscriberName];
    }
  };

  const updateCanvases = () => {
    // For each canvas, get relevant publisher
    // Update Width, Height, Left, Top
    const names = Object.keys(pubsubs);
    for (let i = 0; i < names.length; i += 1) {
      const name = names[i];
      const pubsub = pubsubs[name];
      const canvas = canvases[name];

      if (pubsub == null || canvas == null) {
        console.error(`Null pubsub or canvas for ${name}`);
        continue;
      }

      // Video Dimensions
      const { videoDimensions } = pubsub.stream;

      // Container Dimensions
      const domElement = pubsub.element;
      const containerDimensions = domElement.getBoundingClientRect();

      // Canvas Dimensions
      const canvasDimensions = getCanvasDimensions(containerDimensions, videoDimensions);

      canvas.width = canvasDimensions.width;
      canvas.height = canvasDimensions.height;
  
      canvas.style.position = 'absolute';
      canvas.style.width = canvasDimensions.width;
      canvas.style.height = canvasDimensions.height;
      canvas.style.left = (containerDimensions.width - canvasDimensions.width) / 2;
      canvas.style.top = (containerDimensions.height - canvasDimensions.height) / 2;

      refreshStrokes(name);
    }
  };

  return {
    setDrawListener,
    setClearListener,

    clearDrawing,
    addStroke,

    startPublisher,
    endPublisher,

    startSubscriber,
    endSubscriber,

    updateCanvases,
  };
};
