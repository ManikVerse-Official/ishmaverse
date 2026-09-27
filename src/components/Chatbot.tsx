import { useState } from 'react';
import { MessageCircle, X, Send, User, Minus } from 'lucide-react';
import ishmaverseLogo from '../ishmaverse.png';
import { useBrand } from '../context/BrandContext';
import { SmartImage } from './SmartImage';

type ChatState = 'idle' | 'collecting_details' | 'collecting_budget';

export const Chatbot: React.FC = () => {
  const { brand } = useBrand();
  const [isOpen, setIsOpen] = useState(false);
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [projectDetails, setProjectDetails] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', text: "Hello! I'm Joy, your digital manager. How can I assist you today? If you're interested in a custom project, please let me know.", from: 'bot' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages([...messages, { id: Date.now().toString(), text: userMessage, from: 'user' }]);
    setInput('');

    setTimeout(async () => {
      let botResponse = '';
      
      if (chatState === 'idle') {
        // Check if user is requesting a custom project
        const lowerInput = userMessage.toLowerCase();
        if (lowerInput.includes('custom') || lowerInput.includes('project') || lowerInput.includes('build')) {
          if (!brand.accept_custom_orders) {
            botResponse = `Currently, our team is fully booked and not accepting custom projects for the next ${brand.unavailable_days} days. However, I highly recommend browsing our premium ready-made digital products.`;
            setChatState('idle');
          } else {
            botResponse = "Great! I'd be happy to discuss your custom project. Could you please provide the details of what you're looking for?";
            setChatState('collecting_details');
          }
        } else {
          botResponse = "Thank you for your message! I'm here to help with custom projects or point you to our ready-made products. How can I assist you further?";
        }
      } else if (chatState === 'collecting_details') {
        setProjectDetails(userMessage);
        botResponse = "Thank you for the details! What is your budget for this project?";
        setChatState('collecting_budget');
      } else if (chatState === 'collecting_budget') {
        // Try to extract budget from message
        let budget = 0;
        const match = userMessage.match(/\d+/);
        if (match) {
          budget = parseFloat(match[0]);
        }

        if (budget < brand.minimum_budget_threshold) {
          botResponse = `Thank you. Please note our custom development services require a minimum budget of ${brand.minimum_budget_threshold}. For your current budget, I highly recommend exploring our ready-made products.`;
        } else {
          botResponse = "Thank you! I have collected your requirements. I will pass this directly to our management team, and you will be contacted shortly.";
          // Send to webhook if configured
          if (brand.admin_notification_webhook) {
            try {
              await fetch(brand.admin_notification_webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  project_details: projectDetails,
                  budget: budget,
                  timestamp: new Date().toISOString(),
                }),
              });
            } catch (error) {
              console.error('Failed to send webhook:', error);
            }
          }
        }
        setChatState('idle');
        setProjectDetails('');
      }

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        text: botResponse, 
        from: 'bot' 
      }]);
    }, 500);
  };

  return (
    <div className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-50">
      {isOpen ? (
        <div className="bg-bg-dark-end border border-neon-purple rounded-t-2xl w-72 sm:w-80 shadow-neon flex flex-col max-h-[80vh]">
          <div className="flex items-center justify-between p-4 border-b border-neon-purple/30 bg-gradient-to-r from-bg-dark-end to-bg-dark-start">
            <div className="flex items-center gap-3">
              <SmartImage src={ishmaverseLogo} alt="IshMaVerse" className="w-8 h-8" />
              <span className="font-bold text-white text-sm sm:text-base">IshMaVerse</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white p-1">
                <Minus className="w-5 h-5" />
              </button>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-bg-dark-start">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex items-start gap-2 ${msg.from === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {msg.from === 'bot' && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs bg-neon-purple flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div 
                  className={`max-w-[80%] p-3 rounded-xl text-sm ${
                    msg.from === 'bot' 
                      ? 'bg-neon-purple/20 text-white' 
                      : 'bg-purple-600 text-white'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-neon-purple/30 bg-bg-dark-end">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="TYPE A MESSAGE..."
                className="flex-1 bg-bg-dark-start border border-neon-purple/30 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-neon-purple text-white"
              />
              <button 
                onClick={handleSend}
                className="bg-neon-purple p-2 rounded-xl hover:bg-purple-600 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-neon-purple p-3 sm:p-4 rounded-full shadow-neon hover:bg-purple-600 transition-all"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
