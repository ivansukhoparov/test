import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { appSettings } from './settings/app-settings';
import { User, UserSchema } from './feature/users/domain/user.entity';
import { UsersQueryRepository } from './feature/users/infrastructure/users.query.repository';
import { UsersController } from './feature/users/api/users.controller';
import { UsersService } from './feature/users/application/users.service';
import { CryptoService } from './common/utils/adapters/crypto.service';
import { UsersRepository } from './feature/users/infrastructure/users.repository';
import { BlogsController } from './feature/blogs/api/blogs.controller';
import { BlogsService } from './feature/blogs/application/blogs.service';
import { BlogsRepository } from './feature/blogs/infrastructure/blogs.repository';
import { BlogsQueryRepository } from './feature/blogs/infrastructure/blogs.query.repository';
import { Blog, BlogSchema } from './feature/blogs/domain/blog.entity';
import { Post, PostSchema } from './feature/posts/domain/post.entity';
import { PostsQueryRepository } from './feature/posts/infrastructure/posts.query.repository';
import { PostsController } from './feature/posts/api/posts.controller';
import { PostsService } from './feature/posts/application/posts.service';
import { PostsRepository } from './feature/posts/infrastructure/posts.repository';
import { CommentsController } from './feature/comments/api/comments.controller';
import { CommentsQueryRepository } from './feature/comments/infrastucture/comments.query.repository';
import { TestingController } from './feature/test/api/testing.controller';
import {
  Comment,
  CommentSchema,
} from './feature/comments/domain/comment.entity';
import {
  PostLike,
  PostLikeSchema,
} from './feature/posts/post-likes/domain/post-like.entity';
import { LoginExistsConstraint } from './common/decorators/validate/unique-login';
import { EmailExistsConstraint } from './common/decorators/validate/unique-email';
import { BasicAuthGuard } from './common/guards/basic-auth.guard';
import { AuthService } from './feature/authorization/application/authorization.service';
import { AuthQueryRepository } from './feature/authorization/infrastructure/authorization.query.repository';
import { AccessTokenAuthGuard } from './common/guards/jwt-access-token-auth-guard';
import { AuthController } from './feature/authorization/api/authorization.controller';
import {
  UserEmailConfirmation,
  UserEmailConfirmationSchema,
} from './feature/users/domain/user-email-confirmation.entity';
import { EmailAdapter } from './common/utils/adapters/email.adapter';
import { EmailIsConfirmedConstraint } from './common/decorators/validate/existing-non-confirmed-email';
import { WrongConfirmationCodeConstraint } from './common/decorators/validate/confirmation-code-from-email';
import { CommentsService } from './feature/comments/application/comments.service';
import { CommentsRepository } from './feature/comments/infrastucture/comments.repository';
import {
  CommentLike,
  CommentLikeSchema,
} from './feature/comments/comment-likes/domain/comment-like.entity';
import { PostLikesRepository } from './feature/posts/post-likes/infrastructure/post-likes.repository';
import { AttachUserIdGuard } from './common/guards/access-token-userId-guard';
import { CommentLikesRepository } from './feature/comments/comment-likes/infrastructure/comment-likes.repository';
import { JwtModule } from '@nestjs/jwt';
import { BlogDoesNotExistConstraint } from './common/decorators/validate/existing-blog';
import { RegisterUserUseCase } from './feature/authorization/application/useCases/register-user-use-case';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateTokensAndSessionUseCase } from './feature/authorization/application/useCases/create-tokens-and-session-use-case';
import { UpdateTokensUseCase } from './feature/authorization/application/useCases/update-tokens-use-case';
import { RefreshTokenAuthGuard } from './common/guards/jwt-refresh-token-auth-guard';
import {
  Session,
  SessionSchema,
} from './feature/sessions/domain/session.entity';
import { LogOutUseCase } from './feature/authorization/application/useCases/log-out-use-case';
import { SessionsController } from './feature/sessions/api/sessions.controller';
import { SessionsQueryRepository } from './feature/sessions/infrastructure/sessions.query.repository';
import { DeleteUnusedSessionsUseCase } from './feature/sessions/application/useCases/delete-unused-sessions-use-case';
import { SessionsRepository } from './feature/sessions/infrastructure/sessions.repository';
import { DeleteSessionByDeviceIdUseCase } from './feature/sessions/application/useCases/delete-session-by-deviceId-use-case';
import { ThrottlerModule } from '@nestjs/throttler';

const useCases = [
  RegisterUserUseCase,
  CreateTokensAndSessionUseCase,
  UpdateTokensUseCase,
  LogOutUseCase,
  DeleteUnusedSessionsUseCase,
  DeleteSessionByDeviceIdUseCase,
];

@Module({
  //Module registration
  imports: [
    //cqrs module
    CqrsModule,
    //jwt module
    JwtModule.register({
      global: true,
      /*secret: appSettings.api.JWT_ACCESS_TOKEN_SECRET,
      signOptions: { expiresIn: '10sec' },*/
    }),
    //request limit module
    ThrottlerModule.forRoot([
      {
        ttl: 10000,
        limit: 5,
      },
    ]),
    //mongoose module
    MongooseModule.forRoot(appSettings.api.MONGO_CONNECTION_URI),
    //mongoose users
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    MongooseModule.forFeature([
      {
        name: UserEmailConfirmation.name,
        schema: UserEmailConfirmationSchema,
      },
    ]),
    //mongoose blogs
    MongooseModule.forFeature([
      {
        name: Blog.name,
        schema: BlogSchema,
      },
    ]),
    //mongoose posts
    MongooseModule.forFeature([
      {
        name: Post.name,
        schema: PostSchema,
      },
    ]),
    MongooseModule.forFeature([
      {
        name: PostLike.name,
        schema: PostLikeSchema,
      },
    ]),
    //mongoose comments
    MongooseModule.forFeature([
      {
        name: Comment.name,
        schema: CommentSchema,
      },
    ]),

    MongooseModule.forFeature([
      {
        name: CommentLike.name,
        schema: CommentLikeSchema,
      },
    ]),
    //mongoose sessions
    MongooseModule.forFeature([
      {
        name: Session.name,
        schema: SessionSchema,
      },
    ]),
  ],
  //Controller registration
  controllers: [
    UsersController,
    BlogsController,
    PostsController,
    CommentsController,
    TestingController,
    AuthController,
    SessionsController,
  ],
  //Provider registrations
  providers: [
    //useCases
    ...useCases,
    //users
    UsersQueryRepository,
    UsersRepository,
    UsersService,
    //blogs
    BlogsService,
    BlogsRepository,
    BlogsQueryRepository,
    //posts
    PostsQueryRepository,
    PostsService,
    PostsRepository,
    PostLikesRepository,
    //comments
    CommentsQueryRepository,
    CommentsService,
    CommentsRepository,
    CommentLikesRepository,
    //authorization
    AuthService,
    AuthQueryRepository,
    //sessions
    SessionsQueryRepository,
    SessionsRepository,
    //constraints
    LoginExistsConstraint,
    EmailExistsConstraint,
    EmailIsConfirmedConstraint,
    WrongConfirmationCodeConstraint,
    BlogDoesNotExistConstraint,
    //guards
    BasicAuthGuard,
    AccessTokenAuthGuard,
    AttachUserIdGuard,
    RefreshTokenAuthGuard,
    //adapters
    EmailAdapter,
    CryptoService,
  ],
})
export class AppModule {}
