import { useEffect, useState } from 'react';
import axios from 'axios';

const ChatBadgeUpdater = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const userId = window.Laravel?.user?.id;
    const badgeElement = document.getElementById('unread-chat-count');

    /**
     * Updates the DOM element for the global navigation badge
     */
    const updateBadge = (count) => {
      if (badgeElement) {
        if (count > 0) {
          badgeElement.textContent = count;
          badgeElement.classList.remove('d-none');
        } else {
          badgeElement.textContent = '';
          badgeElement.classList.add('d-none');
        }
      }
    };

    /**
     * Fetches current unread count from the API
     */
    const refreshCount = async () => {
      try {
        const response = await axios.get('/api/chat/unread-count');
        const count = response.data.count;
        setUnreadCount(count);
        updateBadge(count);
      } catch (error) {
        console.error("Error fetching chat count:", error);
      }
    };

    // 1. Initial Fetch on Load
    useEffect(() => {
      if (!userId) return;
      refreshCount();
    }, [userId]);

    /**
     * 2. Real-Time Global Listener.
     * Listens on the User's private channel to increment the global badge.
     */
    useEffect(() => {
      if (!userId || !window.Echo) return;

      const userChannel = `App.Models.User.${userId}`;

      window.Echo.private(userChannel)
        .listen('.MessageSent', (e) => {
          // Verify the message is actually for this user
          if (e.message.receiver_id === userId) {
            setUnreadCount(prevCount => {
              const newCount = prevCount + 1;
              updateBadge(newCount);
              return newCount;
            });
          }
        })
        .error((error) => {
          console.error('Echo global channel error:', error);
        });

      return () => {
        window.Echo.leave(userChannel);
      };
    }, [userId]); 

    /**
     * 3. UI Synchronization Listener.
     * Listens for a custom 'chat-messages-read' event to re-sync with server.
     */
    useEffect(() => {
      if (!userId) return;

      const handleMessagesRead = () => {
        console.log('Syncing global badge after reading messages...');
        refreshCount();
      };

      window.addEventListener('chat-messages-read', handleMessagesRead);

      return () => {
        window.removeEventListener('chat-messages-read', handleMessagesRead);
      };
    }, [userId]);
    
    return null;
};

export default ChatBadgeUpdater;