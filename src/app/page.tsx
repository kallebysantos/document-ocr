"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePipeline } from "@/lib/hooks/use-pipeline";
import { TokenClassificationOutput } from "@xenova/transformers";
import { LoaderCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [text, setText] = useState("");
  const [extraction, setExtraction] = useState<
    TokenClassificationOutput | TokenClassificationOutput[]
  >();

  const tokenClassification = usePipeline(
    "token-classification",
    "KallebySantos/ner-bert-large-cased-pt-lenerbr-onnx"
  );

  const isLoading =
    !tokenClassification.isReady || tokenClassification.isProcessing;

  async function HandleExtract() {
    if (isLoading) {
      console.info("worker is loading...");
      return;
    }

    const outputTokens = await tokenClassification.pipe(text);

    console.log(outputTokens);

    setExtraction(outputTokens);
  }

  return (
    <main className="flex min-h-screen flex-col items-center  gap-8 p-24">
      <h1 className="text-xl font-bold">Insira o texto abaixo</h1>

      <div className="flex container">
        {!tokenClassification.isReady ? (
          <Skeleton className="w-full h-40" />
        ) : (
          <Textarea
            className="w-full"
            value={text}
            onChange={(val) => setText(val.target.value)}
            readOnly={isLoading}
            rows={10}
          ></Textarea>
        )}
      </div>

      <Button className="gap-2" onClick={HandleExtract} disabled={isLoading}>
        {isLoading ? (
          <LoaderCircle className="w-4 h-4 animate-spin" />
        ) : (
          "Processar"
        )}
        {!tokenClassification.isReady && "Inicializando ..."}
      </Button>

      {extraction && <code>{JSON.stringify(extraction)}</code>}
    </main>
  );
}
