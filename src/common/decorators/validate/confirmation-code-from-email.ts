import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../../feature/users/infrastructure/users.repository';
import { UserDocument } from '../../../feature/users/domain/user.entity';
import { UserEmailConfirmationDocument } from '../../../feature/users/domain/user-email-confirmation.entity';

@ValidatorConstraint({ name: 'ConfirmationCodeFromEmail', async: true })
@Injectable()
export class WrongConfirmationCodeConstraint
  implements ValidatorConstraintInterface
{
  constructor(private readonly usersRepository: UsersRepository) {}
  async validate(value: any, args: ValidationArguments) {
    const userEmailConfirmationInfo: UserEmailConfirmationDocument | null =
      await this.usersRepository.findUserByConfirmationCode(value);
    if (!userEmailConfirmationInfo) {
      return false;
    }

    const user: UserDocument | null = await this.usersRepository.findById(
      userEmailConfirmationInfo.userId,
    );
    if (!user) {
      return false;
    }

    if (user.isConfirmed === true) {
      return false;
    }

    if (new Date(userEmailConfirmationInfo.expirationDate) < new Date()) {
      return false;
    }

    return true;
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return `Confirmation code ${validationArguments?.value} is expired, invalid or does not exist in our system`;
  }
}

export function ConfirmationCodeFromEmail(
  property?: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: WrongConfirmationCodeConstraint,
    });
  };
}
