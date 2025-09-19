
import React, { useMemo } from 'react';
import type { Response, Word } from '../types';
// This component relies on a global `WordCloud` object, which would be loaded from a CDN.
// For type safety in the TSX file, we declare it here.
declare const WordCloud: any;

interface WordCloudProps {
  responses: Response[];
}


const processResponsesToWords = (responses: Response[]): Word[] => {
    const wordCounts: { [key: string]: number } = {};

    responses.forEach(response => {
        if (response.isModerated) return;

        // Treat the entire response as a single phrase; preserve punctuation and casing
        const phrase = response.text.trim();
        if (!phrase) return;
        wordCounts[phrase] = (wordCounts[phrase] || 0) + 1;
    });

    return Object.entries(wordCounts)
        .map(([text, value]) => ({ text, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 150); // Limit to top 150 words for performance
};

const WordCloudDisplay: React.FC<WordCloudProps> = ({ responses }) => {
    const words = useMemo(() => processResponsesToWords(responses), [responses]);

    if (words.length === 0) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px] bg-secondary rounded-lg">
                <p className="text-text-secondary text-xl">Waiting for responses to generate word cloud...</p>
            </div>
        );
    }
    
    // NOTE: This part is a placeholder for a real word cloud library like `react-wordcloud`.
    // Since we cannot add dependencies, this simulates the display with styled text.
    // A real implementation would use a canvas-based library for better layout.
    const maxFreq = words.length > 0 ? words[0].value : 1;
    const colors = ['#e94560', '#5da2d5', '#f37121', '#8ac4d0', '#f7d794'];

    return (
        <div className="panel-animated p-6 rounded-lg flex flex-wrap items-center justify-center gap-x-4 gap-y-2 min-h-[480px] ring-1 ring-white/10">
            {words.map((word, index) => {
                const fontSize = 1 + (word.value / maxFreq) * 3; // From 1rem to 4rem
                const color = colors[index % colors.length];
                return (
                    <span
                        key={word.text}
                        className="animate-fadeIn"
                        style={{
                            fontSize: `${fontSize}rem`,
                            lineHeight: 1.1,
                            color: color,
                            fontWeight: 600,
                            padding: '2px 4px',
                        }}
                    >
                        {word.text}
                    </span>
                );
            })}
        </div>
    );
};


export default WordCloudDisplay;
