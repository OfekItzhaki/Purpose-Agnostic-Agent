import { HttpStatus } from '@nestjs/common';
import {
  AdminAuthenticationException,
  AdminValidationException,
  AdminResourceNotFoundException,
  AdminConflictException,
} from './index.js';

describe('Admin Exception Classes', () => {
  describe('AdminAuthenticationException', () => {
    it('should create exception with default message', () => {
      const exception = new AdminAuthenticationException();

      expect(exception).toBeInstanceOf(AdminAuthenticationException);
      expect(exception.name).toBe('AdminAuthenticationException');
      expect(exception.message).toBe('Authentication failed');
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should create exception with custom message', () => {
      const customMessage = 'Invalid admin credentials';
      const exception = new AdminAuthenticationException(customMessage);

      expect(exception.message).toBe(customMessage);
      expect(exception.name).toBe('AdminAuthenticationException');
    });

    it('should have correct HTTP status code', () => {
      const exception = new AdminAuthenticationException();
      expect(exception.getStatus()).toBe(401);
    });
  });

  describe('AdminValidationException', () => {
    it('should create exception with default message', () => {
      const exception = new AdminValidationException();

      expect(exception).toBeInstanceOf(AdminValidationException);
      expect(exception.name).toBe('AdminValidationException');
      expect(exception.message).toBe('Validation failed');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should create exception with custom message', () => {
      const customMessage = 'Invalid persona configuration';
      const exception = new AdminValidationException(customMessage);

      expect(exception.message).toBe(customMessage);
      expect(exception.name).toBe('AdminValidationException');
    });

    it('should have correct HTTP status code', () => {
      const exception = new AdminValidationException();
      expect(exception.getStatus()).toBe(400);
    });
  });

  describe('AdminResourceNotFoundException', () => {
    it('should create exception with default message', () => {
      const exception = new AdminResourceNotFoundException();

      expect(exception).toBeInstanceOf(AdminResourceNotFoundException);
      expect(exception.name).toBe('AdminResourceNotFoundException');
      expect(exception.message).toBe('Resource not found');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it('should create exception with custom message', () => {
      const customMessage = 'Persona with id "test-persona" not found';
      const exception = new AdminResourceNotFoundException(customMessage);

      expect(exception.message).toBe(customMessage);
      expect(exception.name).toBe('AdminResourceNotFoundException');
    });

    it('should have correct HTTP status code', () => {
      const exception = new AdminResourceNotFoundException();
      expect(exception.getStatus()).toBe(404);
    });
  });

  describe('AdminConflictException', () => {
    it('should create exception with default message', () => {
      const exception = new AdminConflictException();

      expect(exception).toBeInstanceOf(AdminConflictException);
      expect(exception.name).toBe('AdminConflictException');
      expect(exception.message).toBe('Resource conflict');
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
    });

    it('should create exception with custom message', () => {
      const customMessage = 'Category with name "general" already exists';
      const exception = new AdminConflictException(customMessage);

      expect(exception.message).toBe(customMessage);
      expect(exception.name).toBe('AdminConflictException');
    });

    it('should have correct HTTP status code', () => {
      const exception = new AdminConflictException();
      expect(exception.getStatus()).toBe(409);
    });
  });

  describe('Exception inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const authException = new AdminAuthenticationException();
      const validationException = new AdminValidationException();
      const notFoundException = new AdminResourceNotFoundException();
      const conflictException = new AdminConflictException();

      expect(authException).toBeInstanceOf(Error);
      expect(validationException).toBeInstanceOf(Error);
      expect(notFoundException).toBeInstanceOf(Error);
      expect(conflictException).toBeInstanceOf(Error);
    });
  });
});
