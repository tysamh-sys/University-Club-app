const axios = require('axios');
const pool = require('../config/db');

/**
 * Send a push notification to specific users via Expo Push API
 * @param {Array} userIds - List of user IDs to notify
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Optional data payload
 */
const sendPushNotification = async (userIds, title, body, data = {}) => {
    try {
        if (!userIds || userIds.length === 0) return;

        // 1. Save notifications to database history for each user
        for (const userId of userIds) {
            await pool.query(
                "INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)",
                [userId, title, body]
            );
        }

        // 2. Fetch push tokens for these users
        const result = await pool.query(
            "SELECT push_token FROM users_tb WHERE id = ANY($1) AND push_token IS NOT NULL",
            [userIds]
        );

        const tokens = result.rows.map(row => row.push_token);
        if (tokens.length === 0) return;

        // 3. Send to Expo Push API
        const messages = tokens.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data,
        }));

        await axios.post('https://exp.host/--/api/v2/push/send', messages, {
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        });

        console.log(`[NotificationService] Sent ${messages.length} notifications.`);
    } catch (error) {
        console.error('[NotificationService] Error:', error.message);
    }
};

/**
 * Notify all admins about a system event
 */
const notifyAdmins = async (title, body, data = {}) => {
    try {
        const admins = await pool.query("SELECT id FROM users_tb WHERE role IN ('admin', 'president')");
        const adminIds = admins.rows.map(row => row.id);
        
        if (adminIds.length > 0) {
            await sendPushNotification(adminIds, title, body, data);
        }
    } catch (error) {
        console.error('[NotificationService] Admin Notify Error:', error.message);
    }
};

module.exports = {
    sendPushNotification,
    notifyAdmins
};
