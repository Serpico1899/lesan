/** @jsx h */
import { Fragment, h, useState } from "../reactDeps.ts";
import { uid } from "../utils/uid.ts";
import { JSONViewer } from "./JSONVeiwer.tsx";
import { TRequest } from "./ManagedLesanContext.tsx";
import BackIcon from "./icon/BackIcon.tsx";
import ExportIcon from "./icon/ExportIcon.tsx";

export function E2E({ configUrl }: { configUrl: (address: string) => void }) {
  const [e2eFroms, setE2eForms] = useState<
    {
      id: string;
      bodyHeaders: string;
      repeat: number;
      captures: { key: string; value: string }[];
    }[]
  >([]);
  const [resultView, setResultView] = useState<boolean>(false);
  const [results, setResults] = useState<
    {
      id: string;
      request: Record<string, any>;
      response: Record<string, any>;
    }[]
  >([]);

  const exportForm = () => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(e2eFroms)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "data.json";

    link.click();
  };

  const jsonFileUpload = (e: any) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (e) => {
      // console.log("e.target.result", e.target!.result as string);
      const data = JSON.parse(e.target!.result as string);
      // console.log("Json Data", data);
      setE2eForms(data);
    };
  };

  const exportResults = () => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(results)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "data.json";

    link.click();
  };

  const [urlAddress, setUrlAddress] = useState("");

  const lesanAPI = async ({
    baseUrl,
    options,
  }: {
    baseUrl: string;
    options: TRequest;
  }) => {
    const fetching = await fetch(`${baseUrl}lesan`, options);
    return await fetching.json();
  };

  const replaceCaptureString = (
    obj: Record<string, any>,
    variablesSet: Set<any>
  ) => {
    for (const key in obj) {
      if (typeof obj[key] === "object") {
        replaceCaptureString(obj[key], variablesSet);
      }

      const value = obj[key];

      if (typeof value === "string" && value.includes("{")) {
        const openBraceIndexes: number[] = [];
        for (let index = 0; index < value.length; index++) {
          if (value[index] === "{") {
            openBraceIndexes.push(index);
          }
        }

        const closeBraceIndexes: number[] = [];
        for (let index = 0; index < value.length; index++) {
          if (value[index] === "}") {
            closeBraceIndexes.push(index);
          }
        }

        const variablesName = openBraceIndexes.map((openBrace, index) => {
          return value.slice(openBrace + 1, closeBraceIndexes[index]);
        });

        variablesName.forEach((variableName) => {
          for (const setValue of variablesSet) {
            if (setValue.key === variableName) {
              obj[key] = obj[key].replace(`{${variableName}}`, setValue.value);
            }
          }
        });
      }
    }
  };

  const runE2eTest = async () => {
    const parsedCaptures = new Set();

    for await (const e2eForm of e2eFroms) {
      const parsedHeaderBody = JSON.parse(e2eForm.bodyHeaders);

      replaceCaptureString(parsedHeaderBody, parsedCaptures);

      const body: TRequest = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...parsedHeaderBody.headers,
        },
        body: JSON.stringify(parsedHeaderBody.body),
      };

      let jsonSendedRequest: any;
      for (let repeat = 0; repeat < e2eForm.repeat; repeat++) {
        jsonSendedRequest = await lesanAPI({
          baseUrl: "http://localhost:8000/",
          options: body,
        });
        setResults((results) => [
          ...results,
          {
            id: uid(),
            request: { ...body, body: parsedHeaderBody.body },
            response: jsonSendedRequest,
          },
        ]);
      }

      const captures = [...e2eForm.captures].filter(
        (capture) => capture.key && capture.value
      );

      const parsedCapuresValue = captures.map((capture) => {
        const parts = capture.value.split("[");
        const value: (string | number)[] = [];

        parts.forEach((part) => {
          let slicedPart: string | number = part.slice(0, part.indexOf("]"));
          if (!isNaN(Number(slicedPart))) {
            slicedPart = Number(slicedPart);
          }
          value.push(slicedPart);
        });
        value.shift();
        return { key: capture.key, value };
      });

      parsedCapuresValue.forEach((capture) => {
        if (capture.value.length > 0) {
          let getedValue: any = jsonSendedRequest;
          capture.value.forEach((capValue) => {
            getedValue = getedValue[capValue];
          });
          parsedCaptures.add({ key: capture.key, value: getedValue });
        }
      });
    }
  };

  return (
    <div className="e2e modal-content">
      {resultView ? (
        <Fragment>
          <br />
          <div className="results">
            <div className="results-buttons">
              <button
                className="btn  e2e-back-button"
                onClick={() => {
                  setResults([]);
                  setResultView(false);
                }}
              >
                <BackIcon />
                <span>Back</span>
              </button>
              <button
                className="btn  e2e-back-button e2e-export_results-button"
                onClick={exportResults}
              >
                <ExportIcon />
                <span>Export</span>
              </button>
              {/* <input type="file" onChange={jsonFileUpload} /> */}
            </div>
            {results.map((re) => (
              <div key={re.id} className="container-detail">
                <section className="container-re ">
                  <span className="container-re-title">REQUEST</span>
                  <JSONViewer jsonData={re.request} />
                </section>
                <section className="container-re history-response">
                  <span className="container-re-title">RESPONSE</span>
                  <JSONViewer jsonData={re.response} />
                </section>
                {/* <hr /> */}
              </div>
            ))}
          </div>
        </Fragment>
      ) : (
        <Fragment>
          <button
            className="btn btn--add"
            onClick={() => {
              setE2eForms((e2eForm) => [
                ...e2eForm,
                {
                  id: uid(),
                  bodyHeaders: `
{
  "headers": {
    "Content-Type": "application/json",
    "Authorization": ""
  },
  "body": {
    "service": "main",
    "contents": "dynamic",
    "wants": {
      "model": "province",
      "act": "addProvince"
    },
    "details": {
      "get": {
        "abb": 0
      },
      "set": {
        "name": "hamedan",
        "enName": "sd",
        "abb": "hm"
      }
    }
  }
}
`,
                  repeat: 1,
                  captures: [],
                },
              ]);
            }}
          >
            add +
          </button>
          {/* <input type="file" onChange={jsonFileUpload} /> */}

          <div className="sidebar__section sidebar__section--headers">
            {e2eFroms.map((e2eForm, idx) => (
              <Fragment>
                <div className="sidebar__input-double" key={e2eForm.id}>
                  <div className="sidebar__section-heading">
                    set test body and headers
                  </div>
                  <textarea
                    placeholder="please paste a request body here"
                    value={e2eForm.bodyHeaders}
                    name={`${e2eForm.id}-body`}
                    rows={18}
                    onChange={(e: any) => {
                      setE2eForms((e2eForm) => {
                        const copy = [...e2eForm];
                        copy[idx].bodyHeaders = e.target.value;
                        return [...copy];
                      });
                    }}
                  />
                  <div className="sidebar__section-heading">
                    set repeat time
                  </div>
                  <input
                    placeholder="set repeat number"
                    value={e2eForm.repeat}
                    name={`${e2eForm.id}-repeat`}
                    type="number"
                    onChange={(e: any) => {
                      setE2eForms((e2eForm) => {
                        const copy = [...e2eForm];
                        copy[idx].repeat = e.target.value;
                        return [...copy];
                      });
                    }}
                  />

                  <div className="sidebar__section-heading">
                    capture variables
                  </div>
                  <button
                    className="btn btn--add"
                    onClick={() => {
                      setE2eForms((e2eForm) => {
                        const copy = [...e2eForm];
                        copy[idx].captures.push({ key: "", value: "" });
                        return copy;
                      });
                    }}
                  >
                    add capture variable item
                  </button>
                  {e2eForm.captures.map((capture, capId) => (
                    <Fragment>
                      <input
                        placeholder="set a variable name"
                        value={capture.key}
                        onChange={(e: any) => {
                          setE2eForms((e2eForm) => {
                            const copy = [...e2eForm];
                            copy[idx].captures[capId].key = e.target.value;
                            return copy;
                          });
                        }}
                      />
                      <input
                        placeholder="set a value for variable"
                        value={capture.value}
                        onChange={(e: any) => {
                          setE2eForms((e2eForm) => {
                            const copy = [...e2eForm];
                            copy[idx].captures[capId].value = e.target.value;
                            return copy;
                          });
                        }}
                      />
                      <hr />
                    </Fragment>
                  ))}
                </div>
                <hr />
                <hr />
              </Fragment>
            ))}
          </div>
          <button
            className="btn btn--add"
            onClick={async () => {
              setResultView(true);
              await runE2eTest();
            }}
          >
            Run E2E Test
          </button>
        </Fragment>
      )}
    </div>
  );
}
