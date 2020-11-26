const fs = require('fs');
const path = require('path');

const getModels = (sequelizeClient) => {
  const fileNames = fs.readdirSync(path.resolve(__dirname));
  const modelFiles = fileNames.map(fileName => path.resolve(__dirname, fileName))
    .filter(fileName => fileName !== __filename);

  const models = {};
  for (let i = 0; i < modelFiles.length; i += 1) {
    const modelFile = modelFiles[i];
    const model = sequelizeClient.import(modelFile);
    const modelName = model.name;
    models[modelName] = model;
    console.log(`Loaded Model: ${modelName}`);
  }

  return models;
};

module.exports = {
  getModels,
};
