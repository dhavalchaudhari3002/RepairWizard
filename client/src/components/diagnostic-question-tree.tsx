import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, MicIcon, ImageIcon, ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import AudioUpload from './audio-upload';
import ImageUpload from './image-upload';
import { DiagnosticTree, QuestionNode, getNextQuestion, createBasicDiagnosticTree } from '@/utils/diagnostic-tree';

interface DiagnosticQuestionTreeProps {
  productCategory: string;
  subCategory?: string;
  onComplete: (answers: DiagnosticAnswers) => void;
  initialState?: DiagnosticAnswers;
}

export interface DiagnosticAnswers {
  questionPath: string[];
  answers: Record<string, string | string[]>;
  audioRecording?: string;
  imageUrl?: string;
  notes?: string;
  finalRecommendation?: string;
}

export default function DiagnosticQuestionTree({
  productCategory,
  subCategory,
  onComplete,
  initialState
}: DiagnosticQuestionTreeProps) {
  // State for the diagnostic tree
  const [tree, setTree] = useState<DiagnosticTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for the current question and answers
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
  const [questionPath, setQuestionPath] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>('');
  
  // Media uploads
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState<string>('');
  
  // Load the diagnostic tree for this product category
  const { data: treeData, isLoading: isTreeLoading } = useQuery({
    queryKey: ['/api/diagnostic-trees', productCategory, subCategory],
    queryFn: async ({ queryKey }) => {
      try {
        const response = await apiRequest(`/api/diagnostic-trees?category=${productCategory}${subCategory ? `&subcategory=${subCategory}` : ''}`);
        if (response.ok) {
          return await response.json();
        } else {
          throw new Error('Failed to load diagnostic tree');
        }
      } catch (error) {
        console.error('Error loading diagnostic tree:', error);
        // Return null to signal we should use the fallback
        return null;
      }
    }
  });
  
  // Initialize the tree and current question
  useEffect(() => {
    setLoading(true);
    
    // If we have tree data from the API, use it
    if (treeData) {
      try {
        const tree = treeData.treeData ? 
          (typeof treeData.treeData === 'string' ? JSON.parse(treeData.treeData) : treeData.treeData) : 
          createBasicDiagnosticTree(productCategory, subCategory);
        
        setTree(tree);
        setCurrentQuestionId(tree.rootQuestionId);
        setQuestionPath([tree.rootQuestionId]);
        setLoading(false);
      } catch (error) {
        console.error('Error parsing diagnostic tree:', error);
        // Fallback to basic tree
        const fallbackTree = createBasicDiagnosticTree(productCategory, subCategory);
        setTree(fallbackTree);
        setCurrentQuestionId(fallbackTree.rootQuestionId);
        setQuestionPath([fallbackTree.rootQuestionId]);
        setLoading(false);
      }
    } 
    // If we don't have tree data (API failed or hasn't loaded yet)
    else if (!isTreeLoading) {
      // Create a basic tree as fallback
      const fallbackTree = createBasicDiagnosticTree(productCategory, subCategory);
      setTree(fallbackTree);
      setCurrentQuestionId(fallbackTree.rootQuestionId);
      setQuestionPath([fallbackTree.rootQuestionId]);
      setLoading(false);
    }
    
    // Load initial state if provided
    if (initialState) {
      setQuestionPath(initialState.questionPath);
      setAnswers(initialState.answers);
      setAudioUrl(initialState.audioRecording);
      setImageUrl(initialState.imageUrl);
      setNotes(initialState.notes || '');
      
      // Set the current question to the last one in the path
      if (initialState.questionPath.length > 0) {
        setCurrentQuestionId(initialState.questionPath[initialState.questionPath.length - 1]);
      }
    }
  }, [treeData, isTreeLoading, productCategory, subCategory, initialState]);
  
  // Get the current question details
  const currentQuestion = tree && currentQuestionId ? tree.questions[currentQuestionId] : null;
  
  // Handle moving to the next question
  const handleNext = () => {
    if (!tree || !currentQuestion) return;
    
    // Save the current answer
    const updatedAnswers = { ...answers };
    updatedAnswers[currentQuestionId] = currentAnswer;
    setAnswers(updatedAnswers);
    
    // Get the next question based on the answer
    const answerIds = Array.isArray(currentAnswer) ? currentAnswer : [currentAnswer as string];
    const nextQuestion = getNextQuestion(tree, currentQuestionId, answerIds);
    
    if (nextQuestion) {
      // Move to the next question
      setCurrentQuestionId(nextQuestion.id);
      setQuestionPath([...questionPath, nextQuestion.id]);
      setCurrentAnswer('');
      
      // Check if this is a leaf node (final recommendation)
      if (nextQuestion.isLeaf) {
        // Prepare the final diagnostic data
        const diagnosticData: DiagnosticAnswers = {
          questionPath: [...questionPath, nextQuestion.id],
          answers: updatedAnswers,
          audioRecording: audioUrl,
          imageUrl: imageUrl,
          notes: notes,
          finalRecommendation: Array.isArray(currentAnswer) ? currentAnswer[0] : currentAnswer as string
        };
        
        // Call the onComplete callback with the diagnostic data
        onComplete(diagnosticData);
      }
    } else {
      // If there's no next question, we're at the end
      const diagnosticData: DiagnosticAnswers = {
        questionPath,
        answers: updatedAnswers,
        audioRecording: audioUrl,
        imageUrl: imageUrl,
        notes: notes
      };
      
      // Call the onComplete callback with the diagnostic data
      onComplete(diagnosticData);
    }
  };
  
  // Handle going back to the previous question
  const handleBack = () => {
    if (questionPath.length <= 1) return;
    
    // Remove the current question from the path
    const newPath = [...questionPath];
    newPath.pop();
    setQuestionPath(newPath);
    
    // Set the current question to the previous one
    const previousQuestionId = newPath[newPath.length - 1];
    setCurrentQuestionId(previousQuestionId);
    
    // Restore the previous answer if it exists
    setCurrentAnswer(answers[previousQuestionId] || '');
  };
  
  // Handle audio upload
  const handleAudioUpload = (audioUrl: string) => {
    setAudioUrl(audioUrl);
  };
  
  // Handle image upload
  const handleImageUpload = (imageUrl: string) => {
    setImageUrl(imageUrl);
  };
  
  // Render the appropriate input based on question type
  const renderQuestionInput = () => {
    if (!currentQuestion) return null;
    
    switch (currentQuestion.type) {
      case 'single-choice':
        return (
          <RadioGroup
            value={currentAnswer as string}
            onValueChange={setCurrentAnswer}
            className="space-y-3"
          >
            {currentQuestion.choices?.map((choice) => (
              <div key={choice.id} className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value={choice.id} id={choice.id} />
                <Label htmlFor={choice.id} className="flex-grow cursor-pointer">
                  {choice.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
        
      case 'multi-choice':
        return (
          <div className="space-y-3">
            {currentQuestion.choices?.map((choice) => (
              <div key={choice.id} className="flex items-center space-x-2 rounded-md border p-3">
                <Checkbox
                  id={choice.id}
                  checked={Array.isArray(currentAnswer) && currentAnswer.includes(choice.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setCurrentAnswer(
                        Array.isArray(currentAnswer)
                          ? [...currentAnswer, choice.id]
                          : [choice.id]
                      );
                    } else {
                      setCurrentAnswer(
                        Array.isArray(currentAnswer)
                          ? currentAnswer.filter((id) => id !== choice.id)
                          : []
                      );
                    }
                  }}
                />
                <Label htmlFor={choice.id} className="flex-grow cursor-pointer">
                  {choice.text}
                </Label>
              </div>
            ))}
          </div>
        );
        
      case 'text':
        return (
          <Textarea
            value={currentAnswer as string}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="min-h-[120px]"
          />
        );
        
      case 'yes-no':
        return (
          <RadioGroup
            value={currentAnswer as string}
            onValueChange={setCurrentAnswer}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <RadioGroupItem value="yes" id="yes" />
              <Label htmlFor="yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <RadioGroupItem value="no" id="no" />
              <Label htmlFor="no">No</Label>
            </div>
          </RadioGroup>
        );
        
      case 'rating':
        return (
          <RadioGroup
            value={currentAnswer as string}
            onValueChange={setCurrentAnswer}
            className="flex space-x-2"
          >
            {[1, 2, 3, 4, 5].map((rating) => (
              <div key={rating} className="flex flex-col items-center">
                <RadioGroupItem
                  value={rating.toString()}
                  id={`rating-${rating}`}
                  className="sr-only"
                />
                <Label
                  htmlFor={`rating-${rating}`}
                  className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 ${
                    currentAnswer === rating.toString()
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/20'
                  }`}
                >
                  {rating}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
        
      default:
        return null;
    }
  };
  
  // Render loading state
  if (loading || isTreeLoading) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardContent className="pt-6 flex flex-col items-center justify-center h-60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading diagnostic questions...</p>
        </CardContent>
      </Card>
    );
  }
  
  // Render error state
  if (error || !tree) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Sorry, we couldn't load the diagnostic questions.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Main render
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>Diagnostic Questions</CardTitle>
        <CardDescription>
          Help us understand your {subCategory || productCategory} issue better
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {currentQuestion && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">{currentQuestion.text}</h3>
              {renderQuestionInput()}
            </div>
            
            {/* Additional media inputs based on question prompts */}
            {currentQuestion.followupAudioPrompt && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">{currentQuestion.followupAudioPrompt}</h4>
                <AudioUpload onAudioCaptured={handleAudioUpload} existingAudio={audioUrl} />
              </div>
            )}
            
            {currentQuestion.followupImagePrompt && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">{currentQuestion.followupImagePrompt}</h4>
                <ImageUpload onImageUploaded={handleImageUpload} initialImageUrl={imageUrl} />
              </div>
            )}
            
            {/* Complementary media suggestion */}
            {!currentQuestion.followupAudioPrompt && imageUrl && !audioUrl && (
              <div className="mt-6 p-4 bg-muted/30 rounded-md border border-muted">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MicIcon className="h-4 w-4 text-primary" />
                  Sound helps diagnose problems better
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Adding a recording of the sound your {subCategory || productCategory} makes can help us diagnose the issue more accurately.
                </p>
                <AudioUpload onAudioCaptured={handleAudioUpload} existingAudio={audioUrl} />
              </div>
            )}
            
            {!currentQuestion.followupImagePrompt && audioUrl && !imageUrl && (
              <div className="mt-6 p-4 bg-muted/30 rounded-md border border-muted">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  A picture is worth a thousand words
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Adding a photo of your {subCategory || productCategory} will help us identify the issue more precisely.
                </p>
                <ImageUpload onImageUploaded={handleImageUpload} initialImageUrl={imageUrl} />
              </div>
            )}
            
            {/* Optional notes field */}
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-2">Additional notes (optional)</h4>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any other details that might help with the diagnosis..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={questionPath.length <= 1}
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={
            (currentQuestion?.type === 'single-choice' || 
             currentQuestion?.type === 'yes-no' || 
             currentQuestion?.type === 'rating') && !currentAnswer ||
            (currentQuestion?.type === 'multi-choice' && 
             (!Array.isArray(currentAnswer) || currentAnswer.length === 0)) ||
            (currentQuestion?.type === 'text' && 
             (typeof currentAnswer !== 'string' || currentAnswer.trim() === ''))
          }
          className="flex items-center gap-2"
        >
          Next
          <ArrowRightIcon className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}