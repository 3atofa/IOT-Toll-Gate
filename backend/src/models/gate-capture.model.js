const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GateCapture = sequelize.define(
    'GateCapture',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      gateId: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: 'gate-1',
      },
      eventType: {
        type: DataTypes.ENUM('access_granted', 'access_denied', 'manual_capture'),
        allowNull: false,
        defaultValue: 'access_granted',
      },
      cardUid: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      imagePath: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      plateText: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      plateConfidence: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      ocrStatus: {
        type: DataTypes.ENUM('pending', 'processing', 'done', 'review_required', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      ocrProcessedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ocrError: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      capturedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'gate_captures',
      underscored: true,
    }
  );

  return GateCapture;
};
