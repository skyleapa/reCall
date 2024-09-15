import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

// Ensure you have SpeechRecognition available (e.g., via browser API or a library)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const SpeechComponent = () => {
    const recognitionRef = useRef(null);
    const [triggered, setTriggered] = useState(false);
    const lastRecallTime = useRef(0);
    const sentencesAfterTrigger = useRef('');

    useEffect(() => {
        if (!recognitionRef.current && SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            recognitionRef.current = recognition;

            recognition.onresult = (event) => {
                let transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join(' ');

                console.log('Transcribed:', transcript);

                const now = Date.now();

                if (triggered) {
                    // Append new transcript to the sentences after the trigger
                    sentencesAfterTrigger.current += ` ${transcript}`;
                    classifyAndPerformAction(sentencesAfterTrigger.current.trim());
                } else if (transcript.toLowerCase().includes('recall') && now - lastRecallTime.current > 2000) {
                    lastRecallTime.current = now;
                    console.log(`"Recall" detected in sentence: ${transcript}`);
                    setTriggered(true);
                    sentencesAfterTrigger.current = ''; // Reset after "recall"
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error', event);
            };

            recognition.onend = () => {
                console.log('Speech recognition service disconnected');
            };

            recognition.start();

            // Cleanup function
            return () => {
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                    recognitionRef.current = null;
                }
            };
        }
    }, [triggered]);

    // Function to classify intent using OpenAI API
    const classifyAndPerformAction = async (sentences) => {
        try {
            const prompt = {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'system', content: `Determine if the following sentence is about finding an object or performing an action: "${sentences}". Reply with "find" or "action".` }],
                max_tokens: 10
            };

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.REACT_APP_TURBO_VISION_API_KEY}` // Use env variable
                },
                body: JSON.stringify(prompt)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            const intent = data.choices[0].message.content.trim().toLowerCase();
            console.log('OpenAI classification:', intent);

            if (intent === 'find') {
                await makeGetRequest('https://recall-c320lqmkc-skyleapas-projects.vercel.app/find');
            } else if (intent === 'action') {
                await makeGetRequest('https://recall-c320lqmkc-skyleapas-projects.vercel.app/action');
            } else {
                console.log('Could not classify the intent correctly.');
            }

            // Reset trigger after action
            setTriggered(false);
        } catch (error) {
            console.error('Error classifying sentence:', error);
        }
    };

    // Function to make GET request
    const makeGetRequest = async (url) => {
        try {
            const response = await axios.get(url);
            console.log('GET request successful:', response.data);
        } catch (error) {
            console.error('Error making GET request:', error);
        }
    };

    return (
        <div>
            <p>Listen for the word "recall" to start capturing sentences...</p>
        </div>
    );
};

export default SpeechComponent;
