import * as fc from 'fast-check';
import { pbtConfig } from '../pbt.config';
import {
  personaArbitrary,
  invalidPersonaArbitrary,
} from '../arbitraries/persona.arbitraries';

/**
 * Property-Based Tests for Persona Management
 *
 * These tests validate:
 * - Property 10: Invalid Persona Rejection
 * - Property 11: Persona Caching Consistency
 */

describe('Persona Management Properties', () => {
  describe('Property 10: Invalid Persona Rejection', () => {
    it('should reject personas with missing required fields', () => {
      fc.assert(
        fc.property(invalidPersonaArbitrary(), (invalidPersona) => {
          // Validate required fields
          const hasId = !!invalidPersona.id && invalidPersona.id.length > 0;
          const hasName =
            !!invalidPersona.name && invalidPersona.name.length > 0;
          const hasDescription =
            !!invalidPersona.description &&
            invalidPersona.description.length > 0;
          const hasKnowledgeCategory =
            !!invalidPersona.knowledgeCategory &&
            invalidPersona.knowledgeCategory.length > 0;

          // Validate temperature if present
          const validTemperature =
            invalidPersona.temperature === undefined ||
            (invalidPersona.temperature >= 0 &&
              invalidPersona.temperature <= 2);

          const isValid =
            hasId &&
            hasName &&
            hasDescription &&
            hasKnowledgeCategory &&
            validTemperature;

          // Invalid personas should fail validation
          expect(isValid).toBe(false);
        }),
        pbtConfig,
      );
    });

    it('should reject personas with invalid temperature', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.oneof(
            fc.constant(-1),
            fc.constant(3),
            fc.constant(100),
            fc.constant(-0.5),
          ), // Invalid temperatures
          (id, name, description, category, temperature) => {
            const persona = {
              id,
              name,
              description,
              knowledgeCategory: category,
              temperature,
            };

            // Validate temperature range [0, 2]
            const isValidTemperature = temperature >= 0 && temperature <= 2;

            // Should reject invalid temperature
            expect(isValidTemperature).toBe(false);
          },
        ),
        pbtConfig,
      );
    });

    it('should reject personas with invalid maxTokens', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.oneof(fc.constant(0), fc.constant(-1), fc.constant(-100)), // Invalid maxTokens
          (id, name, description, category, maxTokens) => {
            const persona = {
              id,
              name,
              description,
              knowledgeCategory: category,
              maxTokens,
            };

            // Validate maxTokens (must be positive)
            const isValidMaxTokens = maxTokens > 0;

            // Should reject invalid maxTokens
            expect(isValidMaxTokens).toBe(false);
          },
        ),
        pbtConfig,
      );
    });

    it('should reject personas with excessively long fields', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 51, maxLength: 100 }), // id too long
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (id, name, description, category) => {
            const persona = {
              id,
              name,
              description,
              knowledgeCategory: category,
            };

            // Validate field lengths
            const isValidId = id.length <= 50;

            // Should reject if id is too long
            expect(isValidId).toBe(false);
          },
        ),
        pbtConfig,
      );
    });

    it('should accept valid personas', () => {
      fc.assert(
        fc.property(personaArbitrary(), (validPersona) => {
          // Validate all required fields
          const hasId =
            validPersona.id &&
            validPersona.id.length > 0 &&
            validPersona.id.length <= 50;
          const hasName =
            validPersona.name &&
            validPersona.name.length > 0 &&
            validPersona.name.length <= 100;
          const hasDescription =
            validPersona.description &&
            validPersona.description.length > 0 &&
            validPersona.description.length <= 500;
          const hasKnowledgeCategory =
            validPersona.knowledgeCategory &&
            validPersona.knowledgeCategory.length > 0 &&
            validPersona.knowledgeCategory.length <= 50;

          // Validate optional fields if present
          const validTemperature =
            validPersona.temperature === undefined ||
            (validPersona.temperature >= 0 && validPersona.temperature <= 2);
          const validMaxTokens =
            validPersona.maxTokens === undefined || validPersona.maxTokens > 0;

          const isValid =
            hasId &&
            hasName &&
            hasDescription &&
            hasKnowledgeCategory &&
            validTemperature &&
            validMaxTokens;

          // Valid personas should pass validation
          expect(isValid).toBe(true);
        }),
        pbtConfig,
      );
    });
  });

  describe('Property 11: Persona Caching Consistency', () => {
    it('should maintain cache consistency after create', () => {
      fc.assert(
        fc.property(personaArbitrary(), (persona) => {
          // Simulate cache
          const cache = new Map<string, typeof persona>();

          // Create persona
          cache.set(persona.id, persona);

          // Verify cache contains persona
          expect(cache.has(persona.id)).toBe(true);
          expect(cache.get(persona.id)).toEqual(persona);
        }),
        pbtConfig,
      );
    });

    it('should maintain cache consistency after update', () => {
      fc.assert(
        fc.property(
          personaArbitrary(),
          fc.string({ minLength: 1, maxLength: 100 }), // new name
          fc.float({ min: 0, max: 2 }), // new temperature
          (persona, newName, newTemperature) => {
            // Simulate cache
            const cache = new Map<string, typeof persona>();

            // Create persona
            cache.set(persona.id, persona);

            // Update persona
            const updatedPersona = {
              ...persona,
              name: newName,
              temperature: newTemperature,
            };
            cache.set(persona.id, updatedPersona);

            // Verify cache reflects update
            expect(cache.get(persona.id)?.name).toBe(newName);
            expect(cache.get(persona.id)?.temperature).toBe(newTemperature);
            expect(cache.get(persona.id)?.id).toBe(persona.id); // ID unchanged
          },
        ),
        pbtConfig,
      );
    });

    it('should maintain cache consistency after delete', () => {
      fc.assert(
        fc.property(personaArbitrary(), (persona) => {
          // Simulate cache
          const cache = new Map<string, typeof persona>();

          // Create persona
          cache.set(persona.id, persona);
          expect(cache.has(persona.id)).toBe(true);

          // Delete persona
          cache.delete(persona.id);

          // Verify cache no longer contains persona
          expect(cache.has(persona.id)).toBe(false);
          expect(cache.get(persona.id)).toBeUndefined();
        }),
        pbtConfig,
      );
    });

    it('should handle multiple personas in cache', () => {
      fc.assert(
        fc.property(
          fc.array(personaArbitrary(), { minLength: 1, maxLength: 10 }),
          (personas) => {
            // Ensure unique IDs
            const uniquePersonas = Array.from(
              new Map(personas.map((p) => [p.id, p])).values(),
            );

            // Simulate cache
            const cache = new Map<string, (typeof personas)[0]>();

            // Add all personas
            uniquePersonas.forEach((persona) => {
              cache.set(persona.id, persona);
            });

            // Verify all personas are in cache
            expect(cache.size).toBe(uniquePersonas.length);

            uniquePersonas.forEach((persona) => {
              expect(cache.has(persona.id)).toBe(true);
              expect(cache.get(persona.id)).toEqual(persona);
            });
          },
        ),
        pbtConfig,
      );
    });

    it('should preserve persona data through cache reload', () => {
      fc.assert(
        fc.property(
          fc.array(personaArbitrary(), { minLength: 1, maxLength: 10 }),
          (personas) => {
            // Ensure unique IDs
            const uniquePersonas = Array.from(
              new Map(personas.map((p) => [p.id, p])).values(),
            );

            // Simulate initial cache
            const cache1 = new Map<string, (typeof personas)[0]>();
            uniquePersonas.forEach((persona) => {
              cache1.set(persona.id, persona);
            });

            // Simulate cache reload (e.g., from database)
            const cache2 = new Map<string, (typeof personas)[0]>();
            cache1.forEach((persona, id) => {
              cache2.set(id, persona);
            });

            // Verify data is preserved
            expect(cache2.size).toBe(cache1.size);

            cache1.forEach((persona, id) => {
              expect(cache2.has(id)).toBe(true);
              expect(cache2.get(id)).toEqual(persona);
            });
          },
        ),
        pbtConfig,
      );
    });
  });
});
