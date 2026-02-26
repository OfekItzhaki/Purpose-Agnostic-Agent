-- Insert Mock Knowledge Data for RAG System Testing
-- This script inserts sample knowledge chunks with mock embeddings
-- Note: These are simplified 768-dimensional zero vectors for testing
-- In production, use real embeddings from Ollama

-- Clean up existing test data (optional)
-- DELETE FROM knowledge_chunks WHERE document_id IN (SELECT id FROM knowledge_documents WHERE source_path LIKE 'mock/%');
-- DELETE FROM knowledge_documents WHERE source_path LIKE 'mock/%';

-- Document 1: Docker Basics
INSERT INTO knowledge_documents (id, source_path, category, file_hash, total_chunks, metadata)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'mock/docker-basics.txt', 'general', 'mock_hash_1', 3, '{"type": "mock", "topic": "docker"}')
ON CONFLICT (source_path) DO NOTHING;

-- Docker Chunk 1
INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  0,
  'Docker is a platform for developing, shipping, and running applications in containers. Containers package software with all its dependencies, ensuring it runs consistently across different environments. A container is a lightweight, standalone executable package that includes everything needed to run software: code, runtime, system tools, libraries, and settings.',
  array_fill(0.1, ARRAY[768])::vector,
  65
) ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Docker Chunk 2
INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  1,
  'Common Docker commands include: docker build to build an image from a Dockerfile, docker run to create and start a container, docker ps to list running containers, docker stop to stop a running container, docker images to list available images, and docker pull to download an image from a registry.',
  array_fill(0.1, ARRAY[768])::vector,
  58
) ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Docker Chunk 3
INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  2,
  'Benefits of Docker include consistency across development, testing, and production environments, isolation of applications in containers, portability as containers can run anywhere Docker is installed, efficiency since containers share the host OS kernel using fewer resources than VMs, and easy scalability.',
  array_fill(0.1, ARRAY[768])::vector,
  52
) ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Document 2: Password Reset Guide
INSERT INTO knowledge_documents (id, source_path, category, file_hash, total_chunks, metadata)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'mock/password-reset.txt', 'general', 'mock_hash_2', 2, '{"type": "mock", "topic": "support"}')
ON CONFLICT (source_path) DO NOTHING;

-- Password Reset Chunk 1
INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  0,
  'To reset your password, follow these steps: 1) Go to the login page and click "Forgot Password?" link below the login form. 2) Enter your registered email address and click "Send Reset Link". 3) Check your email inbox and spam folder for the reset link. 4) Click the reset link in the email (valid for 24 hours). 5) Enter your new password which must be at least 8 characters with one uppercase letter, one lowercase letter, one number, and one special character. 6) Confirm your new password and click "Reset Password".',
  array_fill(0.2, ARRAY[768])::vector,
  112
) ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Password Reset Chunk 2
INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  1,
  'If you did not receive the reset email, check your spam or junk folder, verify your email address is correct, wait 5-10 minutes as emails may be delayed, or try requesting another reset link. If the reset link expired, simply request a new one as links expire after 24 hours. For additional help, contact support at support@example.com or call 1-800-SUPPORT.',
  array_fill(0.2, ARRAY[768])::vector,
  78
) ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Document 3: REST API Guide
INSERT INTO knowledge_documents (id, source_path, category, file_hash, total_chunks, metadata)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'mock/rest-api.txt', 'general', 'mock_hash_3', 2, '{"type": "mock", "topic": "technical"}')
ON CONFLICT (source_path) DO NOTHING;

-- REST API Chunk 1
INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  0,
  'A REST API (Representational State Transfer API) is an architectural style for designing networked applications. It uses HTTP requests to access and manipulate data. The key principles of REST include: client-server architecture where client and server are separate, stateless communication where each request contains all needed information, cacheable responses, uniform interface using URIs to identify resources, and a layered system.',
  array_fill(0.3, ARRAY[768])::vector,
  72
) ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- REST API Chunk 2
INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  1,
  'HTTP methods in REST include: GET to retrieve data from the server, POST to create new resources, PUT to update existing resources, DELETE to remove resources, and PATCH to partially update resources. Common status codes are: 200 OK for successful requests, 201 Created for successful resource creation, 400 Bad Request for invalid requests, 401 Unauthorized when authentication is required, 404 Not Found when a resource does not exist, and 500 Internal Server Error for server errors.',
  array_fill(0.3, ARRAY[768])::vector,
  95
) ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Document 4: Kubernetes Basics
INSERT INTO knowledge_documents (id, source_path, category, file_hash, total_chunks, metadata)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'mock/kubernetes.txt', 'general', 'mock_hash_4', 2, '{"type": "mock", "topic": "technical"}')
ON CONFLICT (source_path) DO NOTHING;

-- Kubernetes Chunk 1
INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  0,
  'Kubernetes (K8s) is an open-source container orchestration platform that automates the deployment, scaling, and management of containerized applications. A Kubernetes cluster consists of nodes (worker machines) that run containerized applications. The smallest deployable unit is a Pod, which can contain one or more containers that share network and storage resources.',
  array_fill(0.4, ARRAY[768])::vector,
  62
) ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Kubernetes Chunk 2
INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  1,
  'Key Kubernetes features include self-healing which restarts failed containers and replaces containers when nodes die, horizontal scaling to scale applications up or down, load balancing to distribute network traffic, automated rollouts and rollbacks for gradual deployment changes, and service discovery so pods can find each other using DNS. Common kubectl commands are: kubectl get pods to list pods, kubectl describe pod to show details, kubectl logs to view logs, and kubectl apply to create or update resources.',
  array_fill(0.4, ARRAY[768])::vector,
  92
) ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Document 5: Creative Writing Tips
INSERT INTO knowledge_documents (id, source_path, category, file_hash, total_chunks, metadata)
VALUES 
  ('55555555-5555-5555-5555-555555555555', 'mock/writing-tips.txt', 'general', 'mock_hash_5', 2, '{"type": "mock", "topic": "creative"}')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Writing Tips Chunk 1
INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  0,
  'Essential elements of creative writing include character development, plot structure, and setting. For character development, create multi-dimensional characters with strengths and flaws, give them clear motivations and goals, show character growth through the story, and use dialogue to reveal personality. The plot structure typically follows: exposition to introduce characters and setting, rising action to build tension, climax as the turning point, falling action for consequences, and resolution to tie up loose ends.',
  array_fill(0.5, ARRAY[768])::vector,
  85
) ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Writing Tips Chunk 2
INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  1,
  'The principle of "show, don''t tell" is crucial in creative writing. Instead of telling readers "She was angry," show it through actions: "Her fists clenched, and her jaw tightened." For dialogue, make each character''s voice distinct, use dialogue to advance the plot, include subtext (what''s not said), avoid excessive dialogue tags, and read dialogue aloud to test naturalness. Common mistakes to avoid include info-dumping (revealing too much backstory at once), purple prose (overly flowery description), flat characters, and inconsistent point of view.',
  array_fill(0.5, ARRAY[768])::vector,
  105
) ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Document 6: Troubleshooting Guide
INSERT INTO knowledge_documents (id, source_path, category, file_hash, total_chunks, metadata)
VALUES 
  ('66666666-6666-6666-6666-666666666666', 'mock/troubleshooting.txt', 'general', 'mock_hash_6', 2, '{"type": "mock", "topic": "support"}')
ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Troubleshooting Chunk 1
INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  0,
  'For internet connection problems, if you have no internet connection, check if Wi-Fi is enabled on your device, restart your router by unplugging it for 30 seconds, forget and reconnect to the Wi-Fi network, check if other devices can connect, and contact your ISP if the problem persists. For slow internet speed, run a speed test at speedtest.net, move closer to the router, reduce the number of connected devices, clear browser cache and cookies, and update router firmware.',
  array_fill(0.6, ARRAY[768])::vector,
  92
) ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Troubleshooting Chunk 2
INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding, token_count)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  1,
  'If your computer is running slow, try these solutions: restart your computer, close unnecessary programs and browser tabs, check Task Manager for resource-heavy processes, run disk cleanup to free up space, disable startup programs, update your operating system and drivers, run an antivirus scan, and consider adding more RAM if it is consistently maxed out. For application crashes, force quit the application, restart your computer, update the application to the latest version, clear application cache, or reinstall the application.',
  array_fill(0.6, ARRAY[768])::vector,
  95
) ON CONFLICT (document_id, chunk_index) DO NOTHING;

-- Verify insertion
SELECT 
  d.source_path,
  d.category,
  d.total_chunks,
  COUNT(c.id) as inserted_chunks
FROM knowledge_documents d
LEFT JOIN knowledge_chunks c ON d.id = c.document_id
WHERE d.source_path LIKE 'mock/%'
GROUP BY d.id, d.source_path, d.category, d.total_chunks
ORDER BY d.source_path;

-- Show summary
SELECT 
  'Mock knowledge inserted successfully!' as status,
  COUNT(DISTINCT d.id) as total_documents,
  COUNT(c.id) as total_chunks
FROM knowledge_documents d
LEFT JOIN knowledge_chunks c ON d.id = c.document_id
WHERE d.source_path LIKE 'mock/%';
