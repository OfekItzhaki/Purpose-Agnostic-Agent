import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator for category name format
 * Validates that the value contains only alphanumeric characters and hyphens
 * Requirements: 5.2
 */
export function IsCategoryName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCategoryName',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }
          // Must contain only alphanumeric characters and hyphens
          return /^[a-zA-Z0-9-]+$/.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain only alphanumeric characters and hyphens`;
        },
      },
    });
  };
}
