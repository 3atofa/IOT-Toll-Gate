const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SecurityAlert = sequelize.define(
    'SecurityAlert',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      captureId: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      alertType: {
        type: DataTypes.ENUM('wanted_person', 'stolen_car', 'plate_review', 'face_review'),
        allowNull: false,
      },
      decision: {
        type: DataTypes.ENUM('allow', 'block', 'review'),
        allowNull: false,
        defaultValue: 'review',
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      relatedName: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      relatedPlate: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      metadata: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'security_alerts',
      underscored: true,
    }
  );

  return SecurityAlert;
};
