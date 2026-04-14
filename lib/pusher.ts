import Pusher from "pusher"

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

export enum NotificationChannel {
  Global = "notifications",
  User = "user",
  Openplay = "open-play",
}

export const pusherChannel = {
  global: () => NotificationChannel.Global,
  user: (userId: string) => `${NotificationChannel.User}-${userId}`,
  openplay: (id: string) => `${NotificationChannel.Openplay}-${id}`,
}
