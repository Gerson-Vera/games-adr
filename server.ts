import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { registerRoomHandlers } from "./sockets/handlers/room";
import { registerGameHandlers } from "./sockets/handlers/game";

const port = parseInt(process.env.PORT ?? "3000", 10);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);

  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? process.env.NEXTAUTH_URL
          : "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] conectado: ${socket.id}`);

    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log(`[Socket] desconectado: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(
      `\n⚡ Versus de Conocimientos corriendo en http://localhost:${port}\n`
    );
  });
});
