import { Server } from 'socket.io';

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });

    // Chat events
    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
    });

    socket.on('leave-room', (roomId: string) => {
      socket.leave(roomId);
    });

    socket.on('chat-message', (data: any) => {
      socket.to(data.roomId).emit('new-message', data);
    });
  });
};