import {useEffect, useRef, useState} from 'react';
import * as tf from '@tensorflow/tfjs';
import {getTopKClasses} from './utils.ts';
import {LayersModel} from "@tensorflow/tfjs";

interface Student {
    name: string;
    picture: string;
    time: string;
}

function App() {
    const modelRef = useRef<LayersModel>();
    const modelClasses = useRef();

    const [ip, setIp] = useState<string | null>(null);

    const [students, setStudents] = useState<Student[]>([]);

    const locationRef = useRef<GeolocationPosition>();

    useEffect(() => {
        const modelUrl = 'https://teachablemachine.withgoogle.com/models/MrXdfwxzO/';
        const loadModel = async () => {
            try {
                const modelURL = `${modelUrl}model.json`;
                const response = await fetch(`${modelUrl}metadata.json`);
                const body = await response.text();
                modelRef.current = await tf.loadLayersModel(modelURL);
                modelClasses.current = JSON.parse(body).labels;

            } catch (e) {
                console.error(e);
            }
        };
        loadModel();
    }, []);

// Start real-time detection
    useEffect(() => {
        const runDetection = async () => {
            if (modelRef.current !== null) {
                const logits = tf.tidy(() => {
                    if (modelRef.current != null) {
                        const imageHtmlElement = document.getElementById('webcam') as HTMLImageElement;

                        let img = tf.browser.fromPixels(imageHtmlElement).toFloat();
                        img = tf.image.resizeNearestNeighbor(img, [modelRef.current.inputs[0].shape[1]!, modelRef.current.inputs[0].shape[2]!]);

                        const offset = tf.scalar(127.5);
                        const normalized = img.sub(offset).div(offset);

                        const batched = normalized.reshape([1, modelRef.current.inputs[0].shape[1]!, modelRef.current.inputs[0].shape[2]!, modelRef.current.inputs[0].shape[3]!]);

                        return modelRef.current.predict(batched);
                    }

                });
                const predictions = await getTopKClasses(logits, modelClasses.current);

                const detectionSpan = document.getElementById('detected-student');

                if (detectionSpan && predictions[0] && predictions[0].score > 0.9 && detectionSpan.innerText !== `Last Detected Student: ${predictions[0].class}` && students.findIndex(s => s.name.toLowerCase() === predictions[0].class.toLowerCase()) === -1) {
                    detectionSpan.innerText = `Last Detected Student: ${predictions[0].class}`;

                    setStudents([...students, {
                        name: predictions[0].class,
                        picture: 'https://via.placeholder.com/150',
                        time: new Date().toTimeString()
                    }]);

                    await fetch('http://localhost:4000/present/' + predictions[0].class, {
                        method: 'POST',
                        body: JSON.stringify({
                            latitude: locationRef.current?.coords.latitude,
                            longitude: locationRef.current?.coords.longitude
                        }),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                }
            }

        };

        const loop = async () => {
            try {
                await runDetection();
                requestAnimationFrame(loop);
            } catch (e) {
                requestAnimationFrame(loop);
            }
        };
        loop();
    }, [students]);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition((e) => {
            locationRef.current = e;
        });
    }, []);

    return (
        <>
            <h2>Today's Date <span>{new Date().toDateString()}</span></h2>

            <div className={"top-section"}>
                <div className={"section"}>

                    <h3>Good morning! Look at the camera 😁</h3>
                    {!ip &&
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            // @ts-expect-error e.target
                            setIp((e.target as never).elements[0].value);
                        }}>
                            <input type={"text"} placeholder={"Enter your IP Address"} required/>
                            <button type={"submit"}>Start</button>
                        </form>
                    }
                    {ip && <img src={ip} alt={"Webcam"} id={"webcam"}
                          crossOrigin={"anonymous"} width={320} height={240}/>}
                </div>

                <div className={"section"}>

                    <h2 id={"detected-student"}>No Student Detected</h2>


                </div>
            </div>

            <div className={"present-list"}>
                <h3>Present List</h3>
                <div>

                    {
                        students.length > 0 ? students.map((student, index) => (
                            <div key={index} className={"student"}>
                                <img src={student.picture} alt={"Student's Picture"} width={128} height={128}/>
                                <span className={"name"}>{student.name}</span>
                                <span className={"time"}>{student.time}</span>
                            </div>
                        )) : <div>No students yet</div>
                    }

                </div>
            </div>

            <div className={"new-student-form"}>
                <h3>Add New Student</h3>
                <p>Make sure to train a new model including the new student</p>

                <form onSubmit={(e) => {
                    e.preventDefault();

                    fetch('http://localhost:4000/students', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: (e.target as any).elements[0].value,
                            picture: (e.target as any).elements[1].value,
                            phoneNum: (e.target as any).elements[2].value
                        })
                    }).then(value => {
                        if (value.ok) {
                            alert('Student added successfully');
                        } else {
                            alert('Error adding student');
                        }
                    });

                    (e.target as any).elements[0].value = '';
                    (e.target as any).elements[1].value = '';
                    (e.target as any).elements[2].value = '';

                }}>
                    <div>
                        <label htmlFor={"student-name"}>Student Name</label>
                        <input required type={"text"} id={"student-name"}/>
                    </div>

                    <div>
                        <label htmlFor={"student-picture"}>Student Picture Url</label>
                        <input required type={"tel"} id={"parents-number"}/>
                    </div>

                    <div>
                        <label htmlFor={"student-picture"}>Parents Phone Number</label>
                        <input required type={"tel"} id={"parents-number"}/>
                    </div>

                    <button type={"submit"}>Add Student</button>
                </form>


            </div>


        </>
    );
}

export default App;