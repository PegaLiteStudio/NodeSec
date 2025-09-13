import * as admin from "firebase-admin";

interface NotificationParams {
    to: string;
    title: string;
    body: string
    image?: string;
}

const sendNotification = ({ to, title, body }: NotificationParams) => {
    let topic = to === "all" ? "app" : to;

    const message: admin.messaging.Message = {
        topic,
        notification: {
            title,
            body,
        },
        android: {
            priority: "high",
            notification: {
                channelId: "high_importance_channel",
                icon: "app_icon",
                sound: "default",
                color: "#bb2231",
            },
        },
        apns: {
            headers: {
                "apns-priority": "10",
            },
            payload: {
                aps: {
                    alert: {
                        title,
                        body
                    },
                    sound: "default",
                    "content-available": 1,
                },
            },
        },
    };

    admin
        .messaging()
        .send(message)
        .then((response) => {
            console.log(response);
        })
        .catch((err) => {
            console.error(err);
        });
};

export { sendNotification };
