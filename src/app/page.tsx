"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePipeline } from "@/lib/hooks/use-pipeline";
import {
  TokenClassificationOutput,
  TokenClassificationSingle,
} from "@xenova/transformers";
import { LoaderCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import clsx from "clsx";

type AggregationGroup = {
  score: number;
  entityGroup: string;
  tokens: TokenClassificationSingle[];
  word: string;
  start: number;
  end: number;
};

function maxAggregation(tokens: TokenClassificationOutput) {
  const grouped: AggregationGroup[] = tokens
    .filter((token) => !token.entity.startsWith("O"))
    .reduce((groups, current) => {
      const isBeginToken = current.entity.startsWith("B-");
      const isWordFragment = current.word.startsWith("##");

      if (isBeginToken && !isWordFragment && current.word.length > 2) {
        return [
          ...groups,
          {
            score: current.score,
            entityGroup: current.entity.replace("B-", ""),
            word: current.word,
            tokens: [current],
            // It should be current.start but 'start' is useless in transformers.js
            start: current.index,
            end: current.index,
          } satisfies AggregationGroup,
        ];
      }

      const lastEntry = groups.pop();

      // ------ this if does not run
      if (!lastEntry) {
        return groups;
      }

      // Discard if index distance is too far: n+1
      if (lastEntry.end + 2 < current.index) {
        const result = [...groups, lastEntry];

        if (isBeginToken) {
          result.push({
            score: current.score,
            entityGroup: current.entity.replace("B-", ""),
            word: current.word.replace("##", ""),
            tokens: [current],
            // It should be current.start but 'start' is useless in transformers.js
            start: current.index,
            end: current.index,
          } satisfies AggregationGroup);
        }

        return result;
      }

      const tokens = [...lastEntry.tokens, current].sort(
        (a, b) => a.score - b.score
      );

      const maxToken = tokens.at(-1);

      const word = lastEntry.word.concat(
        // Include '##' means that word is part of previous, otherwise we need to add a blank space between
        isWordFragment ? current.word.replace("##", "") : " " + current.word
      );

      return [
        ...groups,
        {
          ...lastEntry,
          entityGroup:
            maxToken?.entity.split("-").pop() || lastEntry.entityGroup,
          score: maxToken?.score || lastEntry.score,
          word,
          tokens,
          end: current.index,
        } satisfies AggregationGroup,
      ];
    }, new Array<AggregationGroup>());

  console.log(grouped);
  console.log(
    "MAX:",
    grouped
      .filter((group) => group.entityGroup === "PESSOA")
      .map((group) => group.word)
  );

  return grouped;
}

function firstAggregation(tokens: TokenClassificationOutput) {
  const grouped: AggregationGroup[] = tokens
    .filter((token) => !token.entity.startsWith("O"))
    .reduce((groups, current) => {
      const isBeginToken = current.entity.startsWith("B-");
      const isWordFragment = current.word.startsWith("##");

      if (isBeginToken && !isWordFragment && current.word.length > 2) {
        return [
          ...groups,
          {
            score: current.score,
            entityGroup: current.entity.replace("B-", ""),
            word: current.word,
            tokens: [current],
            // It should be current.start but 'start' is useless in transformers.js
            start: current.index,
            end: current.index,
          } satisfies AggregationGroup,
        ];
      }

      const lastEntry = groups.pop();

      // ------ this if does not run
      if (!lastEntry) {
        return groups;
      }

      // Discard if index distance is too far: n+1
      if (lastEntry.end + 2 < current.index) {
        const result = [...groups, lastEntry];

        if (isBeginToken) {
          result.push({
            score: current.score,
            entityGroup: current.entity.replace("B-", ""),
            word: current.word.replace("##", ""),
            tokens: [current],
            // It should be current.start but 'start' is useless in transformers.js
            start: current.index,
            end: current.index,
          } satisfies AggregationGroup);
        }

        return result;
      }

      const tokens = [...lastEntry.tokens, current].sort(
        (a, b) => b.index - a.index
      );

      const maxToken = tokens.at(-1);

      const word = lastEntry.word.concat(
        // Include '##' means that word is part of previous, otherwise we need to add a blank space between
        isWordFragment ? current.word.replace("##", "") : " " + current.word
      );

      return [
        ...groups,
        {
          ...lastEntry,
          entityGroup:
            maxToken?.entity.split("-").pop() || lastEntry.entityGroup,
          score: maxToken?.score || lastEntry.score,
          word,
          tokens,
          end: current.index,
        } satisfies AggregationGroup,
      ];
    }, new Array<AggregationGroup>());

  console.log(grouped);
  console.log(
    "MAX:",
    grouped
      .filter((group) => group.entityGroup === "PESSOA")
      .map((group) => group.word)
  );

  return grouped;
}

function simpleAggregation(tokens: TokenClassificationOutput) {
  const grouped = tokens
    .filter((token) => !token.entity.startsWith("O"))
    .reduce((groups, current) => {
      if (current.entity.startsWith("B")) {
        return [
          ...groups,
          {
            score: current.score,
            entityGroup: current.entity.replace("B-", ""),
            word: current.word,
            tokens: [current],
            start: current.index,
            end: current.index,
          } satisfies AggregationGroup,
        ];
      }

      const lastEntry = groups.pop();

      if (!lastEntry) {
        return groups;
      }

      // Discard if is not same Entity Group of last entry
      if (lastEntry.entityGroup !== current.entity.replace("I-", "")) {
        return [...groups, lastEntry];
      }

      const tokens = [...lastEntry.tokens, current];

      const score = tokens.reduce(
        (max, token) => Math.max(max, token.score),
        -Infinity
      );

      const word = lastEntry.word.concat(
        // Include '##' means that word is part of previous, otherwise we need to add a blank space between
        current.word.includes("##")
          ? current.word.replace("##", "")
          : " " + current.word
      );

      return [
        ...groups,
        {
          ...lastEntry,
          score,
          word,
          tokens,
          end: current.index,
        } satisfies AggregationGroup,
      ];
    }, new Array<AggregationGroup>());

  console.log(grouped);
  console.log(
    "SIMPLE:",
    grouped
      .filter((group) => group.entityGroup === "PESSOA")
      .map((group) => group.word)
  );

  return grouped;
}

function Token({ value }: { value: TokenClassificationSingle }) {
  return (
    <span
      className={clsx(
        {
          "text-white font-medium px-1 rounded-sm":
            !value.entity.startsWith("O"),
        },
        {
          "-ms-[0.375rem] px-1 rounded-s-none":
            !value.entity.startsWith("O") && value.word.startsWith("##"),
        },
        {
          "-ms-[0.125rem]": value.entity.startsWith("I"),
        },
        { "bg-blue-500": value.entity.includes("PESSOA") },
        { "bg-rose-500": value.entity.includes("ORGANIZACAO") },
        { "bg-emerald-500": value.entity.includes("TEMPO") },
        { "bg-indigo-500": value.entity.includes("LOCAL") },
        { "bg-fuchsia-500": value.entity.includes("LEGISLACAO") },
        { "bg-fuchsia-700": value.entity.includes("JURISPRUDENCIA") }
      )}
    >
      {value.word.replace("##", "")}
    </span>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [extraction, setExtraction] = useState<TokenClassificationOutput>();

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

    const outputTokens = (await tokenClassification.pipe(text, {
      ignore_labels: [],
    })) as TokenClassificationOutput;

    /*
        const grouped = outputTokens.reduce((prev, current, idx, array) => {
          if (current.entity.startsWith("B")) {
            return [...prev, [current]];
          }
    
          const a = prev.pop();
          if (a) {
            return [...prev, [...a, current]];
          }
    
          return prev;
        }, new Array<TokenClassificationSingle[]>());
    
        const mapped = grouped.map((group) => ({
          group,
          entity: group.at(0)?.entity.replace("B-", ""),
          start: group.at(0)?.index,
          end: group.at(-1)?.index,
          words: group.map((item) => item.word.replace("##", "")),
        }));
    
        console.log(grouped);
        console.log(mapped);
        */

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

      <div className="flex gap-4">
        <Button className="gap-2" onClick={HandleExtract} disabled={isLoading}>
          {isLoading ? (
            <LoaderCircle className="w-4 h-4 animate-spin" />
          ) : (
            "Processar"
          )}
          {!tokenClassification.isReady && "Inicializando ..."}
        </Button>

        {extraction && (
          <Button
            variant={"outline"}
            onClick={() => simpleAggregation(extraction)}
          >
            Simple AGG
          </Button>
        )}

        {extraction && (
          <Button
            variant={"outline"}
            onClick={() => maxAggregation(extraction)}
          >
            Max AGG
          </Button>
        )}

        {extraction && (
          <Button
            variant={"outline"}
            onClick={() => firstAggregation(extraction)}
          >
            First AGG
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {extraction &&
          extraction.map((token) => <Token key={token.index} value={token} />)}
      </div>
    </main>
  );
}
