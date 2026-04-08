const buildNotificationMessage = (type, payload = {}) => {
  switch (type) {
    case 'announcement':
      return `New announcement posted: ${payload.title || 'Untitled'}`;
    case 'answer':
      return 'Your question received a new answer';
    case 'material':
      return `New study material uploaded: ${payload.title || 'Untitled'}`;
    default:
      return 'New platform activity';
  }
};

module.exports = {
  buildNotificationMessage,
};
