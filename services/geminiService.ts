import { GoogleGenAI } from "@google/genai";
import type { Delegate } from '../types';

// Safely access process.env.API_KEY to prevent a ReferenceError in browser environments.
const API_KEY = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;

// Conditionally initialize 'ai' to prevent a crash if the API key is missing.
// The 'ai' constant will be null if API_KEY is not set.
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

if (!ai) {
  console.warn("API_KEY environment variable not set. Gemini features will be disabled.");
}

export const generateMessage = async (topic: string): Promise<string> => {
    // Check for the initialized 'ai' instance instead of just the key.
    if (!ai) return "خدمة الذكاء الاصطناعي غير متاحة.";

    const prompt = `
    أنشئ رسالة نصية قصيرة ورسمية باللغة العربية لمشرف عمليات لإرسالها إلى مندوب توصيل.
    موضوع الرسالة هو: "${topic}".
    يجب أن تكون الرسالة واضحة ومباشرة ومناسبة للاستخدام في بيئة عمل.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text ? response.text.replace(/\\n/g, '\n') : "فشل في إنشاء الرسالة.";
    } catch (error) {
        console.error("Error generating message:", error);
        return "حدث خطأ أثناء إنشاء الرسالة.";
    }
};

export interface PerformanceAnalysisPayload {
    totalOrders: number;
    avgDailyOrders: string;
    overallAttendance: string;
    topPerformer: string;
    tierDistribution: {
        excellent: number;
        average: number;
        weak: number;
    };
    delegates: {
        name: string;
        totalOrders: number;
        avgOrders: string;
        attendanceRate: number;
    }[];
}

export const generatePerformanceAnalysis = async (payload: PerformanceAnalysisPayload): Promise<string> => {
    // Check for the initialized 'ai' instance.
    if (!ai) return "خدمة الذكاء الاصطناعي غير متاحة.";

    const prompt = `
    أنت محلل بيانات متخصص في عمليات توصيل المطاعم. أمامك بيانات أداء فريق من المناديب. قم بتحليل هذه البيانات وقدم ملخصًا تنفيذيًا موجزًا باللغة العربية.

    **بيانات الأداء:**
    - إجمالي الطلبات في الفترة: ${payload.totalOrders}
    - متوسط الطلبات اليومي للفريق: ${payload.avgDailyOrders}
    - معدل الحضور العام للفريق: ${payload.overallAttendance}
    - المندوب الأفضل أداءً: ${payload.topPerformer}
    - توزيع مستويات الأداء: ${payload.tierDistribution.excellent} ممتاز، ${payload.tierDistribution.average} متوسط، ${payload.tierDistribution.weak} ضعيف.
    - بيانات المناديب التفصيلية:
    ${payload.delegates.map(d => `  - ${d.name}: ${d.totalOrders} طلبًا، متوسط يومي ${d.avgOrders}، حضور ${d.attendanceRate.toFixed(0)}%`).join('\n')}

    **المطلوب:**
    يجب أن يتكون تحليلك من ثلاثة أقسام واضحة:
    1.  **نقاط القوة:** حدد نقطة قوة واحدة رئيسية بناءً على البيانات (مثال: أداء متميز من أفضل المناديب، أو معدل حضور عام جيد).
    2.  **مجالات التحسين:** حدد مجالاً واحداً رئيسياً للتحسين (مثال: انخفاض أداء بعض المناديب، أو الحاجة لزيادة المتوسط اليومي).
    3.  **توصية قابلة للتنفيذ:** قدم توصية واحدة، واضحة ومحددة، يمكن للمشرف تطبيقها مباشرة لتحسين الأداء بناءً على تحليلك.

    اجعل النص موجزًا وواضحًا ومباشرًا.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "فشل في إنشاء التحليل.";
    } catch (error) {
        console.error("Error generating performance analysis:", error);
        return "حدث خطأ أثناء إنشاء التحليل.";
    }
};

export interface SingleDelegatePayload {
    name: string;
    avgOrders: string;
    performanceTier: string;
    attendanceRate: string;
    efficiency: string;
}

export const generateSingleDelegateAnalysis = async (payload: SingleDelegatePayload): Promise<string> => {
    // Check for the initialized 'ai' instance.
    if (!ai) return "خدمة الذكاء الاصطناعي غير متاحة.";

    const prompt = `
    أنت مدير عمليات خبير تقوم بتقييم أداء مندوب توصيل. بناءً على البيانات التالية، قم بإنشاء تقرير أداء موجز ومهني باللغة العربية.

    **بيانات المندوب:**
    - الاسم: ${payload.name}
    - متوسط الطلبات اليومي: ${payload.avgOrders}
    - مستوى الأداء: ${payload.performanceTier}
    - نسبة الحضور: ${payload.attendanceRate}
    - الكفاءة (طلب/ساعة): ${payload.efficiency}

    **المطلوب:**
    يجب أن يتكون تحليلك من أربعة أقسام واضحة، وكل قسم في فقرة منفصلة:
    1.  **ملخص الأداء:** قدم ملخصًا عامًا لأداء المندوب خلال الفترة.
    2.  **نقطة قوة:** حدد أبرز نقطة قوة في أدائه بناءً على الأرقام.
    3.  **مجال للتحسين:** حدد المجال الرئيسي الذي يحتاج فيه المندوب إلى تطوير.
    4.  **توصية للمشرف:** قدم توصية عملية واحدة للمشرف لمساعدة المندوب على التحسن أو الحفاظ على أدائه.

    استخدم لغة مهنية ومباشرة.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "فشل في إنشاء تحليل المندوب.";
    } catch (error) {
        console.error("Error generating single delegate analysis:", error);
        return "حدث خطأ أثناء إنشاء تحليل المندوب.";
    }
};

// --- New Verification Functions ---

export const verifyDelegateIdentity = async (livePhotoBase64: string, referencePhotoBase64: string): Promise<{ verified: boolean; confidence: string }> => {
    if (!ai) return { verified: true, confidence: "AI Disabled" }; 

    // Enhanced System Instruction for Forensic Analysis
    const prompt = `
    ACT AS A FORENSIC BIOMETRIC SECURITY SYSTEM.
    Your task is to STRICTLY compare two images to verify identity.
    
    Image 1: Official Reference ID Photo.
    Image 2: Live Selfie from camera.

    INSTRUCTIONS:
    1. **Biometric Matching:** Analyze facial landmarks (distance between eyes, nose shape, jawline structure, ear position). Ignore hairstyle, glasses, or lighting differences.
    2. **Strictness Level:** HIGH. If there is significant doubt, return false.
    3. **Anti-Spoofing / Liveness Check:** Look for signs that Image 2 is a photo of a screen (moire patterns, unnatural glare, pixel grid) or a printed photo held up. If suspected, REJECT immediately.
    
    RESPONSE FORMAT:
    Reply strictly with this JSON format: 
    { 
      "match": boolean, 
      "reason": "string (short explanation in English)" 
    }
    
    Examples of reasons: "Face match confirmed", "Bone structure mismatch", "Potential screen spoofing detected", "Face not visible".
    `;
    
    // Clean base64 strings
    const cleanLive = livePhotoBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
    const cleanRef = referencePhotoBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: cleanRef } },
                { inlineData: { mimeType: 'image/jpeg', data: cleanLive } }
            ],
             config: { 
                 responseMimeType: 'application/json',
                 temperature: 0.1 // Low temperature for consistent, strict logic
             }
        });
        
        const text = response.text;
        if (!text) throw new Error("Empty response");
        
        const result = JSON.parse(text);
        return { verified: result.match, confidence: result.reason };

    } catch (error) {
        console.error("Identity verification failed:", error);
        return { verified: false, confidence: "Verification System Error" };
    }
};

export const verifyDelegateVehicle = async (livePhotoBase64: string): Promise<{ verified: boolean; reason: string }> => {
    if (!ai) return { verified: true, reason: "AI Disabled" };

    const prompt = `
    ACT AS A LOGISTICS COMPLIANCE AUDITOR.
    Analyze this image to verify it is a valid "Start of Shift" vehicle check.

    CRITERIA:
    1. **Vehicle Detection:** The image MUST show a real car/vehicle.
    2. **Perspective:** It should be taken from the OUTSIDE (showing the front or side).
    3. **Real Environment:** Ensure it is a real car in a real environment (street/parking). REJECT if it looks like a toy car, a picture on a screen, or a drawing.
    
    RESPONSE FORMAT:
    Reply strictly with this JSON format:
    { "isCar": boolean, "reason": "string" }
    `;

    const cleanLive = livePhotoBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: cleanLive } }
            ],
            config: { responseMimeType: 'application/json', temperature: 0.1 }
        });

        const text = response.text;
        if (!text) throw new Error("Empty response");

        const result = JSON.parse(text);
        return { verified: result.isCar, reason: result.reason };

    } catch (error) {
        console.error("Vehicle verification failed:", error);
        return { verified: false, reason: "Verification System Error" };
    }
};