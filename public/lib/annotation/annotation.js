OTAnnotation = () => {
  const drawingStream = {};
  const drawingHistory = {};
  let drawListener = null;

  const setDrawListener = (listener) => {
    drawListener = listener;
  };

  const getCanvasDimensions = (containerDimensions, videoDimensions) => {
    const { width: videoWidth, height: videoHeight } = videoDimensions;
    const { width: containerWidth, height: containerHeight } = containerDimensions;

    console.log({
      videoWidth,
      videoHeight,
      containerWidth,
      containerHeight,
    });

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

      // Draw
      draw(canvas, drawingStream[name], coordinate);

      // Canvas Dimenstions
      const canvasDimensions = canvas.getBoundingClientRect();

      // Get Normalized
      const normalizedPreviousCoordinate = getNormalizedCoordinate(drawingStream[name], canvasDimensions);
      const normalizedCurrentCoordinate = getNormalizedCoordinate(coordinate, canvasDimensions);

      // Stroke
      const stroke = {
        from: normalizedPreviousCoordinate,
        to: normalizedPreviousCoordinate,
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

  const clearDrawing = (name, canvas) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    delete drawingHistory[name];
  };

  const addStroke = (name, canvas, stroke) => {
    // Add to History
    if (drawingHistory[name] == null) {
      drawingHistory[name] = [];
    }
    drawingHistory[name].push(stroke);

    // Canvas Dimenstions
    const canvasDimensions = canvas.getBoundingClientRect();

    // Get Normalized
    const fromCoordinate = getRelativeCoordinate(stroke.from, canvasDimensions);
    const toCoordinate = getRelativeCoordinate(stroke.to, canvasDimensions);

    // Draw
    draw(canvas, fromCoordinate, toCoordinate);
  };

  const draw = (canvas, previousCoordinate, currentCoordinate) => {
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(previousCoordinate.x, previousCoordinate.y);
    ctx.lineTo(currentCoordinate.x, currentCoordinate.y);
    ctx.stroke();
    ctx.closePath();
  }

  const startPublisher = (publisher) => {
    const publisherName = publisher && publisher.stream && publisher.stream.name || 'unknown';
    console.log(`Start Publisher Annotation - ${publisherName}`);
    // console.log(publisher);

    // Video Dimensions
    const { videoDimensions } = publisher.stream;

    // Container Dimensions
    const domElement = publisher.element;
    const containerDimensions = domElement.getBoundingClientRect();
    // console.log(domElement);
    // console.log(containerDimensions);

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
    canvas.onmouseleave = handleDrawEnd(publisherName, canvas);

    domElement.appendChild(canvas);
  };

  const endPublisher = (publisher) => {
    console.log(`End Publisher Annotation`);
    // console.log(publisher);
  };

  const startSubscriber = (subscriber, domElementId) => {
    const subscriberName = subscriber && subscriber.stream && subscriber.stream.name || 'unknown';
    console.log(`Start Subscriber Annotation - ${subscriberName}`);
    // console.log(subscriber);

    // Video Dimensions
    const { videoDimensions } = subscriber.stream;

    // Container Dimensions
    const domElement = subscriber.element;
    const containerDimensions = domElement.getBoundingClientRect();
    // console.log(domElement);

    // Canvas Dimensions
    const canvasDimensions = getCanvasDimensions(containerDimensions, videoDimensions);

    // Create Canvas
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.width = canvasDimensions.width;
    canvas.style.height = canvasDimensions.height;
    canvas.style.left = (containerDimensions.width - canvasDimensions.width) / 2;
    canvas.style.top = (containerDimensions.height - canvasDimensions.height) / 2;
    // console.log(canvas);

    domElement.appendChild(canvas);
  };

  const endSubscriber = (subscriber) => {
    console.log(`End Subscriber Annotation`);
    // console.log(subscriber);
  };

  return {
    setDrawListener,

    clearDrawing,
    addStroke,

    startPublisher,
    endPublisher,

    startSubscriber,
    endSubscriber,
  };
};
