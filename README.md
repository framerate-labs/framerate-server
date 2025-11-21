# FrameRate Server

A performant type-safe REST API backend for the FrameRate social media platform. Built with Elysia and Bun, providing endpoints for user authentication, media reviews, custom collections, and social interactions.

**View Live Deployment: [FrameRate](https://frame-rate.io)**

**View Frontend: [GitHub Repo](https://github.com/framerate-labs/framerate-web)**

## Overview

FrameRate Server is the backend API that powers the FrameRate platform, providing:
- **Authentication & Sessions** with secure cookie-based auth and JWT support
- **Reviews & Ratings** for movies and TV shows with a 5-star system
- **Collections Management** with full CRUD operations for custom lists
- **Social Features** including likes, saves, and view tracking
- **Media Discovery** via TMDB API integration for trending content
- **Type-Safe Endpoints** with end-to-end type safety using Elysia and Drizzle


## Key Features

- **RESTful Design**: 18+ endpoints across 6 route groups (reviews, lists, actions, user, trending, details)
- **PostgreSQL Database**: Supabase with Drizzle ORM for type-safe queries
- **Type Safety**: Full TypeScript with Elysia's type validation and Zod schema validation
- **Error Handling**: Standardized error responses with request ID tracking
- **CORS Support**: Configured for production and development environments
- **Better Auth Integration**: Modern authentication with email/password, bearer tokens, and JWT
- **Bun Runtime**: High-performance JavaScript runtime for fast startup and execution


## Tech Stack

### Core Framework
- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime and package manager
- **Framework**: [Elysia](https://elysiajs.com/) - Type-safe, Bun-native web framework
- **Language**: [TypeScript](https://www.typescriptlang.org/)

### Database & ORM
- **Database**: [Supabase](https://supabase.com/) - Primary data store
- **ORM**: [Drizzle](https://orm.drizzle.team/) - Type-safe, SQL-first ORM

### Authentication & Security
- **Auth Library**: [Better Auth](https://www.better-auth.com/)
- **CORS**: @elysiajs/cors for cross-origin resource sharing
- **Validation**: [Zod](https://zod.dev/)

### External APIs
- **Media Data**: [The Movie Database (TMDB)](https://www.themoviedb.org/) API


## Architecture Highlights

### Type-Safe API Design
Elysia provides end-to-end type safety from route definition to client consumption:
```typescript
app.get('/reviews/:mediaType/:mediaId', async ({ params, user }) => {
  const review = await getReview(user.id, params.mediaType, params.mediaId);
  return { data: review };
}, { auth: true });

// Type inference: params are validated, user is guaranteed to exist
```


## Technical Decisions

### Why Elysia over Express/Fastify?
- Supports high-performance Bun runtime
- End-to-end type safety without code generation
- Minimal boilerplate with powerful plugins
- Eden Treaty client provides type-safe RPC for frontend integration
- Modern API design with better DX than traditional frameworks

### Why Drizzle ORM?
- SQL-first approach with full TypeScript inference
- Excellent PostgreSQL support with advanced features

### Why Better Auth?
- TypeScript-first authentication library
- Flexible plugin system (email, OAuth, passkeys, username, etc.)
- No vendor lock-in unlike Clerk
- Self-hosted with full control over user data
- Free and open source


## API Endpoints

### Reviews (`/api/v1/reviews`)
- `GET /reviews` - Fetch all user reviews
- `GET /reviews/:mediaType/:mediaId` - Get specific review
- `POST /reviews/:mediaType/:mediaId` - Create/update review (upsert)
- `DELETE /reviews/:mediaType/:mediaId` - Delete review
- `GET /reviews/:mediaType/:mediaId/average` - Get community average rating

### Lists (`/api/v1/lists`)
- `GET /lists/popular` - Fetch trending lists by views
- `GET /lists` - Get user's lists
- `POST /lists` - Create new list
- `PATCH /lists/:listId` - Update list name/slug
- `DELETE /lists/:listId` - Delete list (cascading)

### List Items (`/api/v1/list-items`)
- `GET /list-items` - Check if media is in any list
- `POST /list-items` - Add media to list
- `DELETE /list-items/:id` - Remove item from list

### Actions (`/api/v1/actions`)
- `PATCH /actions/media` - Update review flags (liked/watched)
- `PUT /actions/lists` - Like/save a list
- `DELETE /actions/lists` - Unlike/unsave a list

### User (`/api/v1/user`)
- `GET /user/:username/lists` - Get public lists for user
- `GET /user/:username/lists/:slug` - Get specific list with analytics

### Discovery
- `GET /trending` - TMDB trending media (movies/tv, daily/weekly)
- `GET /details/:type/:id` - TMDB media details with cast/crew

### Authentication (`/api/auth/*`)
- Managed by Better Auth (sign-up, sign-in, sign-out, session refresh)

---

**Note**: This project is a portfolio piece demonstrating backend API development with modern technologies. The frontend client is maintained in the [FrameRate repository](https://github.com/framerate-labs/framerate-web).
