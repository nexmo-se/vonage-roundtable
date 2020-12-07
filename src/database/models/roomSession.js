module.exports = (sequelize, DataTypes) => {
  const RoomSession = sequelize.define('RoomSession', {
    id: {
      type: DataTypes.STRING(45),
      allowNull: false,
      primaryKey: true,
    },
    room: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.STRING(5000),
      allowNull: false,
    },
    muteOnJoin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      default: false,
    },
    lastPing: {
      type: DataTypes.INTEGER,
      allowNull: false,
      default: 0,
    },
    deleted: {
      type: DataTypes.INTEGER,
      allowNull: false,
      default: 0,
    }
  }, {
    timestamps: true,
  });

  RoomSession.associate = (models) => {
    // associations can be defined here
  };

  return RoomSession;
};