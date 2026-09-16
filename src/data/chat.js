/** Persona and canned copy for the chat widget. Swap freely — nothing here
    is wired to a backend; the service layer in lib/chatService.js is. */
export const bot = {
  name: 'Rayyan Assistant',
  role: 'Ask me about his work',
};

export const greeting =
  "Hi! I'm Rayyan's assistant. Ask me about his projects, stack, or how to reach him.";

export const quickReplies = [
  'What does he build?',
  'What is his stack?',
  'Tell me about PrivaMed',
  'How do I contact him?',
];

/** Shown under the composer so visitors know what they are talking to. */
export const disclaimer = 'Answers are generated and may be imperfect.';
