import json
import random
import nltk
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from flask import Blueprint, jsonify, request, session, Flask

# Initialize NLTK
nltk.download('punkt')
nltk.download('wordnet')
lemmatizer = WordNetLemmatizer()

# Flask app and blueprint setup
app = Flask(__name__)
app.secret_key = 'your_secret_key'
chatbot = Blueprint('chatbot', __name__)

# Load intents from JSON file
with open('website/intents.json') as file:
    intents = json.load(file)

# Sample greeting responses
greetings_responses = [
    "Hello! How can I help you today?",
    "Hi there! What can I do for you?",
    "Greetings! How may I assist you?",
    "Hey! Need any help?",
    "Hello! How's it going? What can I do for you?"
]

def tokenize_and_stem(text):
    tokens = word_tokenize(text.lower())
    return [lemmatizer.lemmatize(token) for token in tokens]

def is_greeting(message):
    greetings_keywords = ["hello", "hi", "hey", "greetings", "howdy"]
    words = tokenize_and_stem(message)
    for word in words:
        if word in greetings_keywords:
            return True
    return False

def match_intent(message):
    tokens = tokenize_and_stem(message)
    highest_similarity = 0
    best_intent = None

    for intent in intents['intents']:
        for pattern in intent['patterns']:
            pattern_tokens = tokenize_and_stem(pattern)
            if len(pattern_tokens) == 0:
                continue
            common_tokens = set(tokens) & set(pattern_tokens)
            similarity = len(common_tokens) / len(set(pattern_tokens))
            
            # Check if the pattern matches closely or if it's a clarified version
            if similarity > highest_similarity or message.startswith("to " + pattern):
                highest_similarity = similarity
                best_intent = intent

    if highest_similarity > 0.5:  # Threshold to ensure relevance
        return best_intent
    return None



# Learning mechanism: store unknown queries and responses
learned_responses = []

@chatbot.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message', '').lower().strip()
    session['user_message'] = user_message

    # Check if the message is a greeting
    if is_greeting(user_message):
        response_message = random.choice(greetings_responses)
    else:
        # Check for specific queries
        intent = match_intent(user_message)
        if intent:
            response_message = random.choice(intent['responses'])
        else:
            # If no specific intent is matched, use fallback responses
            fallback_responses = [
                "I'm not sure I understand. Could you please provide more details?",
                "Can you clarify your question? I'm here to help.",
                "I didn't quite get that. Could you elaborate?",
                "Sorry, I don't have an answer for that. Can you ask something else?"
            ]
            response_message = random.choice(fallback_responses)
            # Check if the message clarifies an existing intent
            if user_message.startswith("sigup"):
                clarified_message = "to create an account"
                new_intent = {
                    "tag": f"dynamic_{random.randint(1000, 9999)}",
                    "patterns": [clarified_message],
                    "responses": [response_message]
                }
                intents['intents'].append(new_intent)
                # Save updated intents to JSON file
                with open('website/intents.json', 'w') as file:
                    json.dump(intents, file, indent=4)
    
    session['response_message'] = response_message
    return jsonify({"response": response_message})




@chatbot.route('/learn_from_data', methods=['POST'])
def learn_from_data():
    global intents  # Assuming 'intents' is your global data structure storing intents
    
    # Process collected data and update 'intents' accordingly
    for item in learned_responses:
        user_message = item['message']
        clarified_message = "to " + user_message if user_message.startswith("login") else user_message

        new_intent = {
            "tag": f"dynamic_{random.randint(1000, 9999)}",
            "patterns": [clarified_message],
            "responses": [item['response']]
        }
        intents['intents'].append(new_intent)
    
    # Save updated intents to JSON file
    with open('website/intents.json', 'w') as file:
        json.dump(intents, file, indent=4)
    
    return jsonify({"status": "success", "message": "Learning from data complete!"})
