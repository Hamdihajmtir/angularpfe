import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const sendNotification = functions.https.onRequest(async (req, res) => {
  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { token, notification } = req.body;

    if (!token || !notification) {
      res.status(400).send('Missing required fields');
      return;
    }

    // Envoyer la notification
    const message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {}
    };

    const response = await admin.messaging().send(message);

    res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).send('Error sending notification');
  }
}); 