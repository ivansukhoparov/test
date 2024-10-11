import { CryptoService } from '../../../common/utils/adapters/crypto.service';
import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../users/infrastructure/users.repository';
import { User, UserDocument } from '../../users/domain/user.entity';
import { uuid } from 'uuidv4';
import { ObjectId } from 'mongodb';
import {
  UserEmailConfirmation,
  UserEmailConfirmationDocument,
} from '../../users/domain/user-email-confirmation.entity';
import { EmailAdapter } from '../../../common/utils/adapters/email.adapter';
import {
  NewPasswordRecoveryInputModel,
  RegistrationInputModel,
} from '../api/models/input/input.models';
import { add } from 'date-fns';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly cryptoService: CryptoService,
    private readonly jwtService: JwtService,
    private readonly emailAdapter: EmailAdapter,
  ) {}

  async verifyUser(
    loginOrEmail: string,
    password: string,
  ): Promise<string | null> {
    const user: UserDocument | null =
      await this.usersRepository.findByLoginOrEmail(loginOrEmail);
    if (!user) return null;

    const passwordCheck = await this.cryptoService._comparePasswords(
      password,
      user.passwordHash,
    );
    if (!passwordCheck) return null;

    return user._id.toString();
  }

  async createTokensAndSession(userId: string, deviceName: string, ip: string) {
    //Create Access Token
    const accessTokenPayload = { sub: userId };
    const accessToken = await this.jwtService.signAsync(accessTokenPayload);
    if (!accessToken) return null;

    //Create Refresh Token
    const deviceId = uuid();
    const refreshTokenPayload = { sub: userId, deviceId: deviceId };
    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload);
    if (!refreshToken) return null;

    /*//Create Session
    const payload = await this.jwtService.decode(refreshToken);

    const createdSession = await this.devicesRepository.createSession(
      userId,
      payload.deviceId,
      deviceName,
      ip,
      payload.iat,
      payload.exp,
    );
    if (!createdSession) return null;*/

    return { accessToken, refreshToken };
  }

  async registerUser(createModel: RegistrationInputModel): Promise<boolean> {
    /*const userByLogin: UserDocument | null =
      await this.usersRepository.findByLoginOrEmail(createModel.login);
    if (userByLogin) {
      return false;
    }

    const userByEmail: UserDocument | null =
      await this.usersRepository.findByLoginOrEmail(createModel.email);
    if (userByEmail) {
      return false;
    }*/

    const generatedPasswordHash = await this.cryptoService._generateHash(
      createModel.password,
    );
    if (!generatedPasswordHash) return false;

    const newUser: User = {
      //Omit<'_id'>???
      _id: new ObjectId(),
      login: createModel.login,
      passwordHash: generatedPasswordHash,
      email: createModel.email,
      createdAt: new Date().toISOString(),
      isConfirmed: false,
    };
    const userId = await this.usersRepository.createUser(newUser);
    if (!userId) return false;

    const emailConfirmationInfo: UserEmailConfirmation = {
      _id: new ObjectId(),
      userId: userId,
      confirmationCode: uuid(),
      expirationDate: add(new Date(), {
        hours: 1,
        //minutes: 1
      }).toISOString(),
    };
    const confirmationCode =
      await this.usersRepository.createUserEmailConfirmationInfo(
        emailConfirmationInfo,
      );
    if (!confirmationCode) return false;

    try {
      const msg = `<a href="https://somesite.com/confirm-email?code=${confirmationCode}"> Link</a>`;
      const subject = 'Yo!';

      await this.emailAdapter.sendEmail(createModel.email, subject, msg);
    } catch (error) {
      console.error(error, 'Cannot send an email with confirmation code');
      return false;
    }

    return true;
  }

  async confirmEmail(code: string): Promise<boolean> {
    const userEmailConfirmationInfo: UserEmailConfirmationDocument | null =
      await this.usersRepository.findUserByConfirmationCode(code);
    if (!userEmailConfirmationInfo) {
      return false;
    }

    /*const user: UserDocument | null = await this.usersRepository.findById(
      userEmailConfirmationInfo._id.toString(),
    );
    if (!user) {
      return false;
    }

    if (user.isConfirmed === true) {
      return false;
    }

    if (new Date(userEmailConfirmationInfo.expirationDate) < new Date()) {
      return false;
    }*/

    await this.usersRepository.confirmUser(userEmailConfirmationInfo.userId);

    return true;
  }

  async resendConfirmationCode(email: string) {
    const user: UserDocument | null =
      await this.usersRepository.findByLoginOrEmail(email);
    if (!user) {
      return false; //This email is not in our system
    }

    /*if (user.isConfirmed === true) {
      return false; //User is already confirmed
    }*/

    const newConfirmationCode = uuid();
    const expDate = add(new Date(), {
      hours: 1,
      //minutes: 1
    }).toISOString();

    const updateResult = await this.usersRepository.updateConfirmationCode(
      user._id.toString(),
      newConfirmationCode,
      expDate,
    );
    if (!updateResult) {
      return false; // Cannot update confirmation code
    }

    try {
      const msg = `<a href="https://somesite.com/confirm-email?code=${newConfirmationCode}"> Link</a>`;
      const subject = 'Yo!';
      this.emailAdapter.sendEmail(email, subject, msg);
    } catch (e: unknown) {
      console.error('Error occurred while resending confirmation code', e);
      return false; //Cannot send email
    }
    return true;
  }

  async recoverPassword(email: string) {
    const existingUser: UserDocument | null =
      await this.usersRepository.findUserByEmail(email);

    if (existingUser) {
      const recoveryCode = uuid();
      const expDate = add(new Date(), {
        hours: 1,
        //minutes: 1
      }).toISOString();
      //Update confirmation code
      const updatedRecoveryCode =
        await this.usersRepository.updateConfirmationCode(
          existingUser!._id.toString(),
          recoveryCode,
          expDate,
        );
      if (!updatedRecoveryCode) return false;

      try {
        const msg = `<a href="https://somesite.com/password-recovery?recoveryCode=${recoveryCode}"> Link</a>`;
        const subject = 'Yo!';
        await this.emailAdapter.sendEmail(email, subject, msg);
      } catch (e) {
        console.error('Error occurred while resending recovery code', e);
        return false;
      }
    }

    return true;
  }

  async confirmPasswordRecovery(
    inputModel: NewPasswordRecoveryInputModel,
  ): Promise<boolean> {
    const userEmailConfirmationInfo: UserEmailConfirmationDocument | null =
      await this.usersRepository.findUserByConfirmationCode(
        inputModel.recoveryCode,
      );
    if (!userEmailConfirmationInfo) {
      console.log('User was not found by confirmation code');
      return false;
    }

    const newPasswordHash = await this.cryptoService._generateHash(
      inputModel.newPassword,
    );
    if (!newPasswordHash) return false;

    return await this.usersRepository.updatePassword(
      userEmailConfirmationInfo.userId,
      newPasswordHash,
    );
  }
}
