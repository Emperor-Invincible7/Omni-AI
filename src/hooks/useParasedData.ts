import { useState, useEffect } from 'react';

export function useParsedData(jsonString: string, isStreaming: boolean) {
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (!isStreaming && jsonString) {
            try {
                const clean = jsonString.replace(/```json|```/g, '').trim();
                setData(JSON.parse(clean));
            } catch (e) {
                console.error("Parsing failed", e);
            }
        }
    }, [isStreaming, jsonString]);

    return data;
}