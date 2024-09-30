import { Elysia, t } from "elysia";
import { PrismaClient } from "@prisma/client";
import { swagger } from "@elysiajs/swagger";

// Initialize Prisma Client
const prisma = new PrismaClient();

export const app = new Elysia();

app.use(
  swagger({
    documentation: {
      info: {
        title: "Club API Documentation",
        description: "A simple API for managing user profiles and media.",
        version: "1.0.0",
      },
    },
  })
);

// Profile Management

// Create user profile
app.post(
  "/profile",
  async ({ body, error }) => {
    const { username, email, description, profilePic } = body;

    const checkUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (checkUsername) {
      return error(400, "Username already exists");
    }

    const checkEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (checkEmail) {
      return error(400, "Email already exists");
    }

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        description,
        profilePic,
      },
    });
    return newUser;
  },
  {
    body: t.Object({
      username: t.String(),
      email: t.String({ format: "email" }),
      description: t.String(),
      profilePic: t.String(),
    }),
    detail: {
      summary: "Create a new user profile",
    },
  }
);

// Get user profile
app.get(
  "/profile/:id",
  async ({ params, error }) => {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(params.id) },
    });
    return user || error(404, "User not found");
  },
  {
    detail: {
      summary: "Get a user profile by ID",
    },
  }
);

// Update user profile
app.put(
  "/profile/:id",
  async ({ params, body, error }) => {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!user) {
      return error(404, "User not found");
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(params.id) },
      data: {
        username: body.username || user.username,
        email: body.email || user.email,
        description: body.description || user.description,
        profilePic: body.profilePic || user.profilePic,
      },
    });
    return updatedUser;
  },
  {
    body: t.Object({
      username: t.Optional(t.String()),
      email: t.String({ format: "email" }),
      description: t.Optional(t.String()),
      profilePic: t.Optional(t.String()),
    }),
    detail: {
      summary: "Update a user profile by ID",
    },
  }
);

// Delete user profile
app.delete(
  "/profile/:id",
  async ({ params, error }) => {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(params.id) },
      include: { media: true },
    });

    if (!user) {
      return error(404, "User not found");
    }

    await prisma.user.delete({
      where: { id: parseInt(params.id) },
    });
    return { message: "User deleted successfully" };
  },
  {
    detail: {
      summary: "Delete a user profile by ID",
    },
  }
);

// Media Management

// Create media
app.post(
  "/media",
  async ({ body, error }) => {
    const { title, description, mediaUrl, userId } = body;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: { media: true },
    });

    if (!user) {
      return error(404, "User not found");
    }

    const media = await prisma.media.create({
      data: {
        title,
        description,
        mediaUrl,
        user: {
          connect: { id: parseInt(userId) },
        },
      },
    });
    return media;
  },
  {
    body: t.Object({
      title: t.String(),
      description: t.String(),
      mediaUrl: t.String(),
      userId: t.String(),
    }),
    detail: {
      summary: "Create a new media item for a user",
    },
  }
);

// Get media by id
app.get(
  "/media/:id",
  async ({ params, error }) => {
    const media = await prisma.media.findUnique({
      where: { id: parseInt(params.id) },
    });
    return media || error(404, "Media not found");
  },
  {
    detail: {
      summary: "Get a media item by ID",
    },
  }
);

// Update media
app.put(
  "/media/:id",
  async ({ params, body, error }) => {
    const media = await prisma.media.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!media) {
      return error(404, "Media not found");
    }

    const updatedMedia = await prisma.media.update({
      where: { id: parseInt(params.id) },
      data: {
        title: body.title,
        description: body.description,
        mediaUrl: body.mediaUrl,
      },
    });
    return updatedMedia;
  },
  {
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      mediaUrl: t.Optional(t.String()),
    }),
    detail: {
      summary: "Update a media item by ID",
    },
  }
);

// Delete media
app.delete(
  "/media/:id",
  async ({ params }) => {
    await prisma.media.delete({
      where: { id: parseInt(params.id) },
    });
    return { message: "Media deleted successfully" };
  },
  {
    detail: {
      summary: "Delete a media item by ID",
    },
  }
);

// User Relationships (Follow)

// Follow a user
app.post(
  "/follow",
  async ({ body, error }) => {
    const { followerId, followingId } = body;
    const follower = await prisma.user.findUnique({
      where: { id: parseInt(followerId) },
      include: { media: true },
    });
    const following = await prisma.user.findUnique({
      where: { id: parseInt(followingId) },
      include: { media: true },
    });

    if (!follower || !following) {
      return error(404, "User not found");
    }

    const checkFollow = await prisma.followRelation.findUnique({
      where: {
        followerId_followingId: {
          followerId: parseInt(followerId),
          followingId: parseInt(followingId),
        },
      },
      include: { follower: true, following: true },
    });

    if (checkFollow) {
      return error(400, "Already following");
    }

    const follow = await prisma.followRelation.create({
      data: {
        followerId: parseInt(followerId),
        followingId: parseInt(followingId),
      },
    });
    return follow;
  },
  {
    body: t.Object({
      followerId: t.String(),
      followingId: t.String(),
    }),
    detail: {
      summary: "Follow a user",
    },
  }
);

// Unfollow a user
app.delete(
  "/unfollow",
  async ({ body, error }) => {
    const { followerId, followingId } = body;

    const follower = await prisma.user.findUnique({
      where: { id: parseInt(followerId) },
      include: { media: true },
    });
    const following = await prisma.user.findUnique({
      where: { id: parseInt(followingId) },
      include: { media: true },
    });

    if (!follower || !following) {
      return error(404, "User not found");
    }

    const checkFollow = await prisma.followRelation.findUnique({
      where: {
        followerId_followingId: {
          followerId: parseInt(followerId),
          followingId: parseInt(followingId),
        },
      },
      include: { follower: true, following: true },
    });

    if (!checkFollow) {
      return error(400, "Not following");
    }

    await prisma.followRelation.delete({
      where: {
        followerId_followingId: {
          followerId: parseInt(followerId),
          followingId: parseInt(followingId),
        },
      },
    });
    return { message: "Unfollowed successfully" };
  },
  {
    body: t.Object({
      followerId: t.String(),
      followingId: t.String(),
    }),
    detail: {
      summary: "Unfollow a user",
    },
  }
);

// Feed: Paginated feed of media from followed users that hasn't been viewed yet

app.get(
  "/feed/:userId",
  async ({ params, query }) => {
    const { userId } = params;
    const page = parseInt(query.page) || 1;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    // Get followed users' media that the user hasn't viewed
    const medias = await prisma.media.findMany({
      where: {
        user: {
          following: {
            some: {
              followerId: parseInt(userId),
            },
          },
        },
        viewedBy: {
          none: {
            userId: parseInt(userId),
          },
        },
      },
      skip: offset,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    });

    // mark media as viewed by the user
    // Idealy this would be done in a background job and not here
    for (const media of medias) {
      await prisma.viewedMedia.create({
        data: {
          mediaId: media.id,
          userId: parseInt(userId),
        },
      });
    }

    return medias;
  },
  {
    query: t.Object({
      page: t.String(),
    }),
    detail: {
      summary: "Get a paginated feed of media for a user",
    },
  }
);

// Start the server
app.listen(3000, () => {
  console.log(`Elysia is running at http://localhost:3000`);
});
