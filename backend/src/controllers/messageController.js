const prisma = require('../prismaClient');
const { createNotification } = require('../services/notificationService');

/**
 * GET /api/messages/:requestId
 * Returns the full message thread for a request (chronological order).
 * Any authenticated user who is a participant (requester, driver, or operator) may read.
 */
async function getMessages(req, res) {
  const { requestId } = req.params;
  try {
    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const messages = await prisma.message.findMany({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

/**
 * POST /api/messages/:requestId
 * Sends a message in the thread. Only REQUESTER and WAREHOUSE_OPERATOR may post.
 * Emits Socket.io event "message:new" to all participants of the request.
 */
async function sendMessage(req, res) {
  const { requestId } = req.params;
  const { content } = req.body;
  const io = req.app.get('io');

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  try {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { requester: true, driver: true },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const message = await prisma.message.create({
      data: {
        requestId,
        senderId: req.user.id,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    // Emit "message:new" to all participants of the request
    if (io) {
      const participantIds = [request.requesterId];
      if (request.driverId) participantIds.push(request.driverId);

      participantIds.forEach((uid) => {
        io.to(`user:${uid}`).emit('message:new', { ...message, requestId });
      });

      // Also emit to any operator watching the request room
      io.to(`request:${requestId}`).emit('message:new', { ...message, requestId });
    }

    // Create a notification for all other participants
    const otherParticipants = [request.requesterId];
    if (request.driverId) otherParticipants.push(request.driverId);
    const recipientIds = otherParticipants.filter((uid) => uid !== req.user.id);

    for (const uid of recipientIds) {
      await createNotification(
        {
          userId: uid,
          type: 'GENERAL',
          title: 'Nova mensagem',
          message: `${req.user.name || 'Alguém'} enviou uma mensagem na solicitação.`,
        },
        io,
      );
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
}

module.exports = { getMessages, sendMessage };
