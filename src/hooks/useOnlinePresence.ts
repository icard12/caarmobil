import { useEffect, useState } from 'react';
import { socket } from '../lib/api';
import { useTeam } from '../contexts/TeamContext';

interface OnlineUser {
    userId: string;
    userName: string;
    lastSeen: Date;
}

export function useOnlinePresence() {
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const { currentUser } = useTeam();

    useEffect(() => {
        if (!currentUser) return;

        // Announce presence when component mounts
        socket.emit('user-online', {
            userId: currentUser.id,
            userName: currentUser.name
        });

        // Send heartbeat every 30 seconds
        const heartbeatInterval = setInterval(() => {
            socket.emit('user-heartbeat', currentUser.id);
        }, 30000);

        // Listen for online users updates
        const handleOnlineUsersUpdate = (users: OnlineUser[]) => {
            setOnlineUsers(users);
        };

        socket.on('online-users-updated', handleOnlineUsersUpdate);

        // Cleanup
        return () => {
            clearInterval(heartbeatInterval);
            socket.off('online-users-updated', handleOnlineUsersUpdate);
        };
    }, [currentUser]);

    return {
        onlineUsers,
        isUserOnline: (userId: string) => onlineUsers.some(u => u.userId === userId)
    };
}
