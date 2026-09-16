'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import JsBarcode from 'jsbarcode';

import {
    ArrowLeft,
    Search,
    CheckCircle,
    Printer,
} from 'lucide-react';


// ============================================================
// BROWSER PRINT TYPE
// ============================================================

declare global {
    interface Window {
        BrowserPrint: any;
    }
}


// ============================================================
// ZEBRA DEVICE TYPE
// ============================================================

type ZebraDevice = {
    name?: string;
    uid?: string;
    deviceType?: string;
    connection?: string;

    send: (
        data: string,
        successCallback?: () => void,
        errorCallback?: (error: any) => void
    ) => void;
};


// ============================================================
// PAGE
// ============================================================

export default function StickerPage() {

    const params = useParams();

    const router = useRouter();

    const barcodeRef =
        useRef<SVGSVGElement | null>(null);


    // ========================================================
    // PRODUCT ID
    // ========================================================

    const id = Number(
        params.id
    );


    // ========================================================
    // STATES
    // ========================================================

    const [product, setProduct] =
        useState<any | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const [printing, setPrinting] =
        useState(false);

    const [printerStatus, setPrinterStatus] =
        useState(
            'Loading Zebra Browser Print...'
        );

    const [printers, setPrinters] =
        useState<ZebraDevice[]>([]);

    const [selectedPrinter, setSelectedPrinter] =
        useState<ZebraDevice | null>(null);


    // ========================================================
    // LOAD PRODUCT
    // ========================================================

    useEffect(() => {

        async function loadProduct() {

            try {

                setLoading(true);

                setError('');


                const response =
                    await fetch(
                        `/api/products/${id}`,
                        {
                            method: 'GET',
                            cache: 'no-store',
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        `Failed to load product (${response.status})`
                    );

                }


                const data =
                    await response.json();


                console.log(
                    'PRODUCT API RESPONSE:',
                    data
                );


                /*
                 * Supports both:
                 *
                 * { ...product }
                 *
                 * or
                 *
                 * { product: {...} }
                 */

                const loadedProduct =
                    data?.product ??
                    data;


                if (
                    !loadedProduct ||
                    !loadedProduct.id
                ) {

                    throw new Error(
                        'Invalid product data.'
                    );

                }


                setProduct(
                    loadedProduct
                );


            } catch (err: any) {

                console.error(
                    'PRODUCT LOAD ERROR:',
                    err
                );


                setError(
                    err?.message ||
                    'Failed to load product.'
                );


            } finally {

                setLoading(false);

            }

        }


        if (
            !isNaN(id) &&
            id > 0
        ) {

            loadProduct();

        } else {

            setError(
                'Invalid product ID.'
            );

            setLoading(false);

        }

    }, [id]);


    // ========================================================
    // GENERATE SCREEN BARCODE
    // ========================================================

    useEffect(() => {

        if (
            !product?.barcode
        ) {

            return;

        }


        if (
            !barcodeRef.current
        ) {

            return;

        }


        try {

            JsBarcode(
                barcodeRef.current,

                String(
                    product.barcode
                ),

                {
                    format: 'CODE128',

                    /*
                     * Screen preview
                     */

                    width: 2,

                    height: 52,

                    displayValue: true,

                    fontSize: 11,

                    fontOptions: 'bold',

                    textMargin: 2,

                    margin: 0,

                    marginTop: 0,

                    marginBottom: 0,

                    marginLeft: 0,

                    marginRight: 0,

                }
            );


        } catch (err) {

            console.error(
                'SCREEN BARCODE ERROR:',
                err
            );

        }

    }, [product]);


    // ========================================================
    // LOAD ZEBRA BROWSER PRINT
    // ========================================================

    useEffect(() => {

        if (
            typeof window ===
            'undefined'
        ) {

            return;

        }


        // ----------------------------------------------------
        // LOAD SCRIPT
        // ----------------------------------------------------

        function loadScript(
            src: string
        ): Promise<void> {

            return new Promise(
                (
                    resolve,
                    reject
                ) => {


                    const existing =
                        document.querySelector(
                            `script[src="${src}"]`
                        );


                    if (existing) {

                        resolve();

                        return;

                    }


                    const script =
                        document.createElement(
                            'script'
                        );


                    script.src = src;

                    script.async = false;


                    script.onload = () => {

                        console.log(
                            `Loaded Zebra script: ${src}`
                        );

                        resolve();

                    };


                    script.onerror = () => {

                        console.error(
                            `Failed to load: ${src}`
                        );

                        reject(
                            new Error(
                                `Failed to load ${src}`
                            )
                        );

                    };


                    document.body.appendChild(
                        script
                    );

                }
            );

        }


        // ----------------------------------------------------
        // LOAD BOTH ZEBRA FILES
        // ----------------------------------------------------

        async function loadBrowserPrint() {

            try {

                setPrinterStatus(
                    'Loading Zebra Browser Print...'
                );


                await loadScript(
                    '/zebra/BrowserPrint-3.1.250.min.js'
                );


                await loadScript(
                    '/zebra/BrowserPrint-Zebra-1.1.250.min.js'
                );


                console.log(
                    'Browser Print loaded.'
                );


                console.log(
                    'BrowserPrint object:',
                    window.BrowserPrint
                );


                setPrinterStatus(
                    'Browser Print ready. Click Find Zebra.'
                );


            } catch (err) {

                console.error(
                    'BROWSER PRINT LOAD ERROR:',
                    err
                );


                setPrinterStatus(
                    'Browser Print failed to load.'
                );

            }

        }


        loadBrowserPrint();

    }, []);


    // ========================================================
    // WAIT FOR BROWSER PRINT
    // ========================================================

    async function waitForBrowserPrint() {

        let attempts = 0;


        while (
            !window.BrowserPrint &&
            attempts < 20
            ) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        500
                    )
            );


            attempts++;

        }


        if (
            !window.BrowserPrint
        ) {

            throw new Error(
                'Zebra Browser Print is not running.'
            );

        }


        return window.BrowserPrint;

    }


    // ========================================================
    // CLEAN ZPL TEXT
    // ========================================================

    function cleanZPL(
        value: any
    ): string {

        if (
            value === null ||
            value === undefined
        ) {

            return '';

        }


        return String(value)

            .replace(
                /\^/g,
                ' '
            )

            .replace(
                /~/g,
                ' '
            )

            .replace(
                /[\r\n]+/g,
                ' '
            );

    }


    // ========================================================
    // CREATE FINAL STICKER ZPL
    //
    // ZD230
    // 203 DPI
    // 3" x 1.89"
    //
    // 3 inch  = 609 dots
    // 1.89in  = 383 dots
    // ========================================================

    function createStickerZPL(item: any): string {

        const productName =
            cleanZPL(item?.name || 'PRODUCT');

        const barcode =
            cleanZPL(item?.barcode || '');

        const price =
            Number(item?.sellingPrice || 0).toFixed(2);


        let zpl = '';

        // =========================================
        // START
        // =========================================

        zpl += '^XA\n';

        // Unicode
        zpl += '^CI28\n';

        // 3" width @ 203 DPI
        zpl += '^PW609\n';

        // 1.89" height @ 203 DPI
        zpl += '^LL383\n';

        // Label origin
        zpl += '^LH0,0\n';


        // =========================================
        // PRODUCT NAME
        // Slightly lower
        // =========================================

        zpl += '^FO10,32\n';

        zpl += '^A0N,25,25\n';

        zpl += '^FB589,1,0,C\n';

        zpl += `^FD${productName}^FS\n`;


        // =========================================
        // BARCODE
        // CENTERED
        // =========================================

        if (barcode) {

            /*
             * Label width = 609 dots
             *
             * Barcode approximate width = 400 dots
             *
             * (609 - 400) / 2 = ~104
             *
             * Therefore X = 104
             */

            zpl += '^FO140,88\n';

            // Module width = 2
            zpl += '^BY2,2,55\n';

            // CODE 128
            zpl += '^BCN,55,Y,N,N\n';

            // Barcode value
            zpl += `^FD${barcode}^FS\n`;
        }


        // =========================================
        // PRICE
        // Lower part of sticker
        // =========================================

        zpl += '^FO10,235\n';

        zpl += '^A0N,32,32\n';

        zpl += '^FB589,1,0,C\n';

        zpl += `^FDRS: ${price}^FS\n`;


        // =========================================
        // END
        // =========================================

        zpl += '^XZ';

        return zpl;
    }


    // ========================================================
    // DISCOVER ZEBRA PRINTERS
    // ========================================================

    async function discoverPrinters(
        showAlert: boolean = true
    ): Promise<ZebraDevice[]> {


        const BP =
            await waitForBrowserPrint();


        setPrinterStatus(
            'Searching for Zebra printer...'
        );


        return new Promise(
            (
                resolve,
                reject
            ) => {


                BP.getLocalDevices(

                    (
                        devices: ZebraDevice[]
                    ) => {


                        console.log(
                            'ALL BROWSER PRINT DEVICES:',
                            devices
                        );


                        // ========================================
                        // NO DEVICES
                        // ========================================

                        if (
                            !devices ||
                            devices.length === 0
                        ) {


                            setPrinters([]);

                            setSelectedPrinter(null);


                            setPrinterStatus(
                                'No printer detected.'
                            );


                            if (showAlert) {

                                alert(
                                    'No Zebra printer found.\n\n' +

                                    'Check:\n' +

                                    '1. Zebra ZD230 is ON\n' +

                                    '2. USB cable connected\n' +

                                    '3. Zebra driver installed\n' +

                                    '4. Browser Print is running'
                                );

                            }


                            resolve([]);

                            return;

                        }


                        // ========================================
                        // FILTER PRINTER DEVICES
                        // ========================================

                        const printerDevices =
                            devices.filter(
                                (
                                    device: ZebraDevice
                                ) => {


                                    const name =
                                        String(
                                            device?.name ||
                                            ''
                                        ).toLowerCase();


                                    const type =
                                        String(
                                            device?.deviceType ||
                                            ''
                                        ).toLowerCase();


                                    return (

                                        type.includes(
                                            'printer'
                                        )

                                        ||

                                        name.includes(
                                            'zebra'
                                        )

                                        ||

                                        name.includes(
                                            'zdesigner'
                                        )

                                        ||

                                        name.includes(
                                            'zd230'
                                        )

                                    );

                                }
                            );


                        console.log(
                            'PRINTER DEVICES:',
                            printerDevices
                        );


                        setPrinters(
                            printerDevices
                        );


                        // ========================================
                        // NO ZEBRA
                        // ========================================

                        if (
                            printerDevices.length === 0
                        ) {


                            setSelectedPrinter(
                                null
                            );


                            setPrinterStatus(
                                'No Zebra printer detected.'
                            );


                            if (showAlert) {

                                alert(
                                    'Browser Print is running, but no Zebra printer was detected.'
                                );

                            }


                            resolve([]);

                            return;

                        }


                        // ========================================
                        // FIND ZD230
                        // ========================================

                        const zd230 =
                            printerDevices.find(
                                (
                                    device: ZebraDevice
                                ) => {


                                    const name =
                                        String(
                                            device?.name ||
                                            ''
                                        ).toLowerCase();


                                    return (

                                        name.includes(
                                            'zd230'
                                        )

                                        ||

                                        name.includes(
                                            'zdesigner'
                                        )

                                    );

                                }
                            );


                        // ========================================
                        // SELECT PRINTER
                        // ========================================

                        const selected =
                            zd230 ||
                            printerDevices[0];


                        console.log(
                            'SELECTED PRINTER:',
                            selected
                        );


                        setSelectedPrinter(
                            selected
                        );


                        setPrinterStatus(
                            `Printer selected: ${
                                selected?.name ||
                                'Zebra Printer'
                            }`
                        );


                        if (showAlert) {

                            alert(
                                'Zebra printer found! ✅\n\n' +

                                `Name: ${
                                    selected?.name ||
                                    'Unnamed'
                                }\n\n` +

                                `Type: ${
                                    selected?.deviceType ||
                                    'Printer'
                                }`
                            );

                        }


                        resolve(
                            printerDevices
                        );

                    },


                    (
                        err: any
                    ) => {


                        console.error(
                            'Browser Print device error:',
                            err
                        );


                        setPrinters([]);

                        setSelectedPrinter(
                            null
                        );


                        setPrinterStatus(
                            'Browser Print device error.'
                        );


                        if (showAlert) {

                            alert(
                                'Browser Print error:\n\n' +
                                String(err)
                            );

                        }


                        reject(err);

                    },


                    'printer'
                );

            }
        );

    }


    // ========================================================
    // FIND PRINTER
    // ========================================================

    async function handleFindPrinter() {

        try {

            await discoverPrinters(
                true
            );

        } catch (err) {

            console.error(
                'FIND PRINTER ERROR:',
                err
            );

        }

    }


    // ========================================================
    // TEST PRINT
    //
    // IMPORTANT:
    // Test uses SAME FINAL STICKER layout.
    // No AB MART
    // No ZD230
    // No TEXT PRINT OK
    // ========================================================

    async function handleTestPrint() {

        try {

            setPrinting(true);


            let printer =
                selectedPrinter;


            // ================================================
            // FIND PRINTER IF NOT SELECTED
            // ================================================

            if (!printer) {

                const devices =
                    await discoverPrinters(
                        false
                    );


                printer =
                    devices.find(
                        (
                            device
                        ) => {


                            const name =
                                String(
                                    device?.name ||
                                    ''
                                ).toLowerCase();


                            return (

                                name.includes(
                                    'zd230'
                                )

                                ||

                                name.includes(
                                    'zdesigner'
                                )

                            );

                        }
                    )

                    ||

                    devices[0];

            }


            // ================================================
            // CHECK
            // ================================================

            if (!printer) {

                throw new Error(
                    'No Zebra printer found.'
                );

            }


            if (
                typeof printer.send !==
                'function'
            ) {

                throw new Error(
                    'Selected printer cannot receive print data.'
                );

            }


            // ================================================
            // TEST PRODUCT
            // ================================================

            const testProduct = {

                name:
                    'TEST PRODUCT',

                barcode:
                    '20697577019',

                sellingPrice:
                    180,

            };


            // ================================================
            // CREATE TEST ZPL
            // ================================================

            const testZPL =
                createStickerZPL(
                    testProduct
                );


            console.log(
                'TEST ZPL:',
                testZPL
            );


            setPrinterStatus(
                'Sending test sticker...'
            );


            // ================================================
            // SEND
            // ================================================

            printer.send(

                testZPL,

                () => {


                    console.log(
                        'TEST PRINT SUCCESS'
                    );


                    setPrinterStatus(
                        '✓ Test sticker printed successfully.'
                    );


                    setPrinting(false);

                },

                (
                    err: any
                ) => {


                    console.error(
                        'TEST PRINT ERROR:',
                        err
                    );


                    setPrinting(false);


                    setPrinterStatus(
                        'Test print failed.'
                    );


                    alert(
                        'Test print failed:\n\n' +
                        String(err)
                    );

                }
            );


        } catch (err: any) {


            console.error(
                'TEST PRINT EXCEPTION:',
                err
            );


            setPrinting(false);


            setPrinterStatus(
                'Test print failed.'
            );


            alert(
                err?.message ||
                String(err)
            );

        }

    }


    // ========================================================
    // ACTUAL PRODUCT PRINT
    // ========================================================

    async function handlePrint() {

        // ====================================================
        // PRODUCT CHECK
        // ====================================================

        if (!product) {

            alert(
                'Product not found.'
            );

            return;

        }


        // ====================================================
        // BARCODE CHECK
        // ====================================================

        if (!product.barcode) {

            alert(
                'This product does not have a barcode.'
            );

            return;

        }


        try {

            setPrinting(true);


            let printer =
                selectedPrinter;


            // =================================================
            // FIND PRINTER
            // =================================================

            if (!printer) {

                const devices =
                    await discoverPrinters(
                        false
                    );


                printer =
                    devices.find(
                        (
                            device
                        ) => {


                            const name =
                                String(
                                    device?.name ||
                                    ''
                                ).toLowerCase();


                            return (

                                name.includes(
                                    'zd230'
                                )

                                ||

                                name.includes(
                                    'zdesigner'
                                )

                            );

                        }
                    )

                    ||

                    devices[0];

            }


            // =================================================
            // CHECK PRINTER
            // =================================================

            if (!printer) {

                throw new Error(
                    'No Zebra printer found.'
                );

            }


            if (
                typeof printer.send !==
                'function'
            ) {

                throw new Error(
                    'Selected Zebra printer cannot receive ZPL.'
                );

            }


            // =================================================
            // CREATE ZPL
            // =================================================

            const zpl =
                createStickerZPL(
                    product
                );


            console.log(
                'PRINT PRODUCT:',
                product
            );


            console.log(
                'FINAL ZPL:',
                zpl
            );


            setPrinterStatus(
                `Printing: ${
                    product.name
                }`
            );


            // =================================================
            // SEND TO ZEBRA
            // =================================================

            printer.send(

                zpl,

                () => {


                    console.log(
                        'PRODUCT PRINT SUCCESS'
                    );


                    setPrinterStatus(
                        '✓ Sticker printed successfully.'
                    );


                    setPrinting(false);

                },

                (
                    err: any
                ) => {


                    console.error(
                        'PRODUCT PRINT ERROR:',
                        err
                    );


                    setPrinting(false);


                    setPrinterStatus(
                        'Sticker printing failed.'
                    );


                    alert(
                        'Sticker printing failed:\n\n' +
                        String(err)
                    );

                }
            );


        } catch (err: any) {


            console.error(
                'PRINT EXCEPTION:',
                err
            );


            setPrinting(false);


            setPrinterStatus(
                'Sticker printing failed.'
            );


            alert(
                err?.message ||
                String(err)
            );

        }

    }


    // ========================================================
    // LOADING SCREEN
    // ========================================================

    if (loading) {

        return (

            <div className="loading-page">

                <div>

                    Loading sticker...

                </div>

            </div>

        );

    }


    // ========================================================
    // ERROR SCREEN
    // ========================================================

    if (error) {

        return (

            <div className="error-page">

                <div>

                    <h2>
                        Error
                    </h2>

                    <p>
                        {error}
                    </p>

                    <button
                        onClick={() =>
                            router.back()
                        }
                    >

                        Go Back

                    </button>

                </div>

            </div>

        );

    }


    // ========================================================
    // PRODUCT NOT FOUND
    // ========================================================

    if (!product) {

        return (

            <div className="error-page">

                Product not found.

            </div>

        );

    }


    // ========================================================
    // PRODUCT DISPLAY VALUES
    // ========================================================

    const productName =
        product?.name ||
        'PRODUCT';


    const price =
        Number(
            product?.sellingPrice || 0
        ).toFixed(2);


    // ========================================================
    // UI
    // ========================================================

    return (

        <div className="sticker-page">


            {/* ==================================================
                TOP CONTROLS
            ================================================== */}

            <div className="no-print screen-controls">


                {/* BACK BUTTON */}

                <button
                    type="button"
                    className="back-button"
                    onClick={() =>
                        router.back()
                    }
                >

                    <ArrowLeft
                        size={16}
                    />

                    Back

                </button>


                {/* BUTTONS */}

                <div className="button-group">


                    {/* FIND PRINTER */}

                    <button
                        type="button"
                        className="find-button"
                        onClick={
                            handleFindPrinter
                        }
                        disabled={
                            printing
                        }
                    >

                        <Search
                            size={16}
                        />

                        Find Zebra

                    </button>


                    {/* TEST PRINT */}

                    <button
                        type="button"
                        className="test-button"
                        onClick={
                            handleTestPrint
                        }
                        disabled={
                            printing
                        }
                    >

                        <CheckCircle
                            size={16}
                        />

                        Test Print

                    </button>


                    {/* PRINT */}

                    <button
                        type="button"
                        className="print-button"
                        onClick={
                            handlePrint
                        }
                        disabled={
                            printing
                        }
                    >

                        <Printer
                            size={16}
                        />

                        {printing
                            ? 'Printing...'
                            : 'Print Sticker'
                        }

                    </button>

                </div>

            </div>


            {/* ==================================================
                PRINTER STATUS
            ================================================== */}

            <div className="no-print printer-status">


                <div>

                    <strong>
                        Printer:
                    </strong>

                    {' '}

                    {
                        selectedPrinter?.name ||
                        'Not selected'
                    }

                </div>


                <div className="status-text">

                    {printerStatus}

                </div>

            </div>


            {/* ==================================================
                PRINTER LIST
            ================================================== */}

            {
                printers.length > 0 && (

                    <div className="no-print printer-list">


                        <div className="printer-list-title">

                            Detected Printers

                        </div>


                        {
                            printers.map(
                                (
                                    printer,
                                    index
                                ) => (

                                    <button
                                        type="button"
                                        key={
                                            printer.uid ||
                                            index
                                        }
                                        className={
                                            selectedPrinter ===
                                            printer
                                                ? 'printer-item selected'
                                                : 'printer-item'
                                        }
                                        onClick={() => {

                                            setSelectedPrinter(
                                                printer
                                            );


                                            setPrinterStatus(
                                                `Selected: ${
                                                    printer.name ||
                                                    'Zebra Printer'
                                                }`
                                            );

                                        }}
                                    >


                                        <span>

                                            {
                                                printer.name ||
                                                'Unnamed Printer'
                                            }

                                        </span>


                                        {
                                            selectedPrinter ===
                                            printer && (

                                                <CheckCircle
                                                    size={16}
                                                />

                                            )
                                        }

                                    </button>

                                )
                            )
                        }

                    </div>

                )
            }


            {/* ==================================================
                STICKER PREVIEW
            ================================================== */}

            <div className="preview-area">


                <div
                    id="sticker"
                >


                    {/* ==========================================
                        PRODUCT NAME
                    ========================================== */}

                    <div className="product-name">

                        {productName}

                    </div>


                    {/* ==========================================
                        BARCODE
                    ========================================== */}

                    <div className="barcode-section">


                        {
                            product?.barcode
                                ? (

                                    <svg
                                        ref={
                                            barcodeRef
                                        }
                                        className="barcode"
                                    />

                                )
                                : (

                                    <div className="no-barcode">

                                        No Barcode

                                    </div>

                                )
                        }


                    </div>


                    {/* ==========================================
                        PRICE
                    ========================================== */}

                    <div className="price">

                        RS: {price}

                    </div>


                </div>

            </div>


            {/* ==================================================
                CSS
            ================================================== */}

            <style jsx global>{`

                /* =================================================
                   RESET
                ================================================= */

                * {

                    box-sizing:
                            border-box;

                }


                html,
                body {

                    margin:
                            0;

                    padding:
                            0;

                }


                body {

                    font-family:
                            Arial,
                            Helvetica,
                            sans-serif;

                }


                /* =================================================
                   PAGE
                ================================================= */

                .sticker-page {

                    min-height:
                            100vh;

                    width:
                            100%;

                    background:
                            #eeeeee;

                    display:
                            flex;

                    flex-direction:
                            column;

                    align-items:
                            center;

                    padding:
                            25px;

                }


                /* =================================================
                   LOADING
                ================================================= */

                .loading-page {

                    width:
                            100%;

                    height:
                            100vh;

                    display:
                            flex;

                    align-items:
                            center;

                    justify-content:
                            center;

                    font-family:
                            Arial,
                            Helvetica,
                            sans-serif;

                    font-size:
                            18px;

                }


                /* =================================================
                   ERROR
                ================================================= */

                .error-page {

                    width:
                            100%;

                    min-height:
                            100vh;

                    display:
                            flex;

                    align-items:
                            center;

                    justify-content:
                            center;

                    font-family:
                            Arial,
                            Helvetica,
                            sans-serif;

                    text-align:
                            center;

                }


                .error-page h2 {

                    margin:
                            0 0 8px 0;

                }


                .error-page p {

                    margin:
                            0 0 15px 0;

                }


                .error-page button {

                    border:
                            none;

                    background:
                            #111111;

                    color:
                            white;

                    padding:
                            9px 15px;

                    border-radius:
                            6px;

                    cursor:
                            pointer;

                }


                /* =================================================
                   CONTROL AREA
                ================================================= */

                .screen-controls {

                    width:
                            100%;

                    max-width:
                            900px;

                    display:
                            flex;

                    align-items:
                            center;

                    justify-content:
                            space-between;

                    gap:
                            15px;

                    margin-bottom:
                            10px;

                }


                .button-group {

                    display:
                            flex;

                    align-items:
                            center;

                    gap:
                            8px;

                }


                .back-button,
                .find-button,
                .test-button,
                .print-button {

                    border:
                            none;

                    border-radius:
                            6px;

                    padding:
                            9px 14px;

                    display:
                            flex;

                    align-items:
                            center;

                    justify-content:
                            center;

                    gap:
                            6px;

                    font-size:
                            13px;

                    font-weight:
                            600;

                    cursor:
                            pointer;

                }


                .back-button {

                    background:
                            #dddddd;

                    color:
                            #111111;

                }


                .find-button {

                    background:
                            #2563eb;

                    color:
                            white;

                }


                .test-button {

                    background:
                            #16a34a;

                    color:
                            white;

                }


                .print-button {

                    background:
                            #111111;

                    color:
                            white;

                }


                .back-button:disabled,
                .find-button:disabled,
                .test-button:disabled,
                .print-button:disabled {

                    opacity:
                            0.55;

                    cursor:
                            not-allowed;

                }


                /* =================================================
                   STATUS
                ================================================= */

                .printer-status {

                    width:
                            100%;

                    max-width:
                            900px;

                    background:
                            white;

                    border:
                            1px solid #dddddd;

                    border-radius:
                            6px;

                    padding:
                            10px 13px;

                    margin-bottom:
                            10px;

                    font-size:
                            12px;

                    color:
                            #111111;

                    line-height:
                            1.5;

                }


                .status-text {

                    margin-top:
                            2px;

                    color:
                            #555555;

                }


                /* =================================================
                   PRINTER LIST
                ================================================= */

                .printer-list {

                    width:
                            100%;

                    max-width:
                            900px;

                    background:
                            white;

                    border:
                            1px solid #dddddd;

                    border-radius:
                            6px;

                    padding:
                            12px;

                    margin-bottom:
                            15px;

                }


                .printer-list-title {

                    font-size:
                            13px;

                    font-weight:
                            700;

                    margin-bottom:
                            8px;

                }


                .printer-item {

                    width:
                            100%;

                    display:
                            flex;

                    align-items:
                            center;

                    justify-content:
                            space-between;

                    border:
                            1px solid #dddddd;

                    background:
                            white;

                    padding:
                            8px 10px;

                    border-radius:
                            5px;

                    margin-bottom:
                            5px;

                    cursor:
                            pointer;

                    text-align:
                            left;

                }


                .printer-item:hover {

                    background:
                            #f5f5f5;

                }


                .printer-item.selected {

                    border-color:
                            #2563eb;

                    background:
                            #eff6ff;

                }


                /* =================================================
                   PREVIEW AREA
                ================================================= */

                .preview-area {

                    display:
                            flex;

                    align-items:
                            center;

                    justify-content:
                            center;

                    padding:
                            25px;

                }


                /* =================================================
                   ACTUAL STICKER
                   
                   3" x 1.89"
                ================================================= */

                #sticker {

                    width:
                            3in;

                    height:
                            1.89in;

                    background:
                            white;

                    color:
                            black;

                    margin:
                            0;

                    padding:
                            0;

                    overflow:
                            hidden;

                    display:
                            flex;

                    flex-direction:
                            column;

                    align-items:
                            center;

                    justify-content:
                            flex-start;

                    font-family:
                            Arial,
                            Helvetica,
                            sans-serif;

                    border:
                            1px solid #dddddd;

                }


                /* =================================================
                   PRODUCT NAME
                   
                   TOP
                ================================================= */

                .product-name {

                    width:
                            100%;

                    height:
                            0.36in;

                    flex-shrink:
                            0;

                    display:
                            flex;

                    align-items:
                            center;

                    justify-content:
                            center;

                    text-align:
                            center;

                    padding:
                            0 6px;

                    margin:
                            0;

                    font-size:
                            16px;

                    font-weight:
                            700;

                    line-height:
                            1;

                    white-space:
                            nowrap;

                    overflow:
                            hidden;

                    text-overflow:
                            ellipsis;

                }


                /* =================================================
                   BARCODE SECTION
                ================================================= */

                .barcode-section {

                    width:
                            100%;

                    height:
                            0.83in;

                    flex-shrink:
                            0;

                    display:
                            flex;

                    align-items:
                            center;

                    justify-content:
                            center;

                    overflow:
                            hidden;

                    padding:
                            0;

                    margin:
                            0;

                }


                /* =================================================
                   BARCODE SVG
                ================================================= */

                .barcode {

                    width:
                            2.25in;

                    height:
                            0.58in;

                    max-width:
                            2.25in;

                    display:
                            block;

                    margin:
                            0 auto;

                }


                /* =================================================
                   NO BARCODE
                ================================================= */

                .no-barcode {

                    font-size:
                            11px;

                    color:
                            #555555;

                }


                /* =================================================
                   PRICE
                ================================================= */

                .price {

                    width:
                            100%;

                    height:
                            0.43in;

                    flex-shrink:
                            0;

                    display:
                            flex;

                    align-items:
                            center;

                    justify-content:
                            center;

                    text-align:
                            center;

                    padding:
                            0;

                    margin:
                            0;

                    font-size:
                            24px;

                    font-weight:
                            900;

                    line-height:
                            1;

                }


                /* =================================================
                   PRINT
                ================================================= */

                @media print {


                    @page {

                        size:
                                3in 1.89in;

                        margin:
                                0;
                        

                    }


                    html,
                    body {

                        width:
                                3in;

                        height:
                                1.89in;

                        margin:
                                0;

                        padding:
                                0;

                        background:
                                white;

                    }


                    body {

                        overflow:
                                hidden;

                    }


                    .no-print {

                        display:
                                none !important;

                    }


                    .sticker-page {

                        width:
                                3in;

                        height:
                                1.89in;

                        min-height:
                                1.89in;

                        margin:
                                0;

                        padding:
                                0;

                        background:
                                white;

                        display:
                                block;

                    }


                    .preview-area {

                        width:
                                3in;

                        height:
                                1.89in;

                        margin:
                                0;

                        padding:
                                0;

                        display:
                                block;

                    }


                    #sticker {

                        width:
                                3in;

                        height:
                                1.89in;

                        margin:
                                0;

                        padding:
                                0;

                        border:
                                none;

                        overflow:
                                hidden;

                    }
                    /* =========================================
                       PRODUCT NAME
                       ========================================= */

                    .product-name {

                        width: 100%;

                        height: 0.42in;

                        flex-shrink: 0;

                        display: flex;

                        align-items: center;

                        justify-content: center;

                        text-align: center;

                        padding: 0 6px;

                        margin: 0;

                        font-size: 16px;

                        font-weight: 700;

                        line-height: 1;

                        white-space: nowrap;

                        overflow: hidden;

                        text-overflow: ellipsis;
                    }


                    /* =========================================
                       BARCODE
                       ========================================= */

                    .barcode-section {

                        width: 100%;

                        height: 0.90in;

                        flex-shrink: 0;

                        display: flex;

                        align-items: center;

                        justify-content: center;

                        overflow: hidden;

                        padding: 0;

                        margin: 0;
                    }


                    .barcode {

                        width: 2.20in;

                        height: 0.60in;

                        display: block;

                        margin: 0 auto;
                    }


                    /* =========================================
                       PRICE
                       ========================================= */

                    .price {

                        width: 100%;

                        height: 0.48in;

                        flex-shrink: 0;

                        display: flex;

                        align-items: center;

                        justify-content: center;

                        text-align: center;

                        padding: 0;

                        margin-top: 0.08in;

                        font-size: 24px;

                        font-weight: 900;

                        line-height: 1;
                    }
                }

            `}</style>

        </div>

    );

}