import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator for persona ID format
 * Validates that the value contains only lowercase letters, numbers, and hyphens
 * Requirements: 8.5
 */
export function IsPersonaId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPersonaId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }
          // Must contain only lowercase letters, numbers, and hyphens
          return /^[a-z0-9-]+$/.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain only lowercase letters, numbers, and hyphens`;
        },
      },
    });
  };
}
