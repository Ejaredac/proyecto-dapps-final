require('dotenv').config();
const fs = require('fs')
const FormData = require('form-data');
const axios = require("axios")
const { ethers } = require("ethers")

const contract = require("../artifacts/contracts/NFTContract.sol/ArGram.json");
const {
    PINATA_API_KEY,
    PINATA_SECRET_KEY,
    API_URL,
    PRIVATE_KEY,
    PUBLIC_KEY,
    CONTRACT_ADDRESS
} = process.env;

const equipos = [
    { numero: 1, cuenta: "0x79198Ffe6ff89ed71eFD362cF411F8982e2B61ab" },
    { numero: 2, cuenta: "" },
    { numero: 3, cuenta: "0x6Ecd38C6f142581032065EE488130EC473e3A8e8" },
    { numero: 4, cuenta: "0x947d9640703f2F11bbd6CCcf63D001C421d6ae67" },
    { numero: 5, cuenta: "0x907cB51bAA17C0A85825f28Cc53C32A0435938a5 " },
    { numero: 6, cuenta: "0x05f73d32a2aBae186bD0DBCACfaDD7C79d6FA943" },
    { numero: 7, cuenta: "0x35eb3F93B0149Dc8E1b3656979707299457e22Cc" },
    { numero: 8, cuenta: "0xbb5a3b6902ee652eea4073abb349d892561caa29" },
    { numero: 9, cuenta: "0x8ce113e2345addd87c00727890aed3471a135ae1" },
    { numero: 10, cuenta: "0x90ca446ecBE474288562BeF18D5723094b851806" },
 ];
    

async function createImgInfo() {
    const authResponse = await axios.get("https://api.pinata.cloud/data/testAuthentication", {
        headers: {
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_KEY,
        },
    });
    console.log(authResponse)
    const stream = fs.createReadStream("./images/toEquipo10.jpg");
    const data = new FormData()
    data.append("file", stream)
    const fileResponse = await
        axios.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            data,
            {
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
                    pinata_api_key: PINATA_API_KEY,
                    pinata_secret_api_key: PINATA_SECRET_KEY
                }
            })
    const { data: fileData = {} } = fileResponse;
    const { IpfsHash } = fileData;
    const fileIPFS = `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;
    console.log(fileIPFS)
    return fileIPFS;
}
//createImgInfo();
async function createJsonInfo() {
    var fileIPFS = await createImgInfo();
    const metadata = {
        image: fileIPFS,
        name: "NFT para el equipo 10",
        description: "De parte del equipo 11: Un buen tour",
        attributes: [
            { "trait_type": "color", "value": "brown" },
            { "trait_type": "background", "value": "white" },
        ]
    }
    const pinataJSONBody = {
        pinataContent: metadata
    }
    const jsonResponse = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        pinataJSONBody,
        {
            headers: {
                "Content-Type": "application/json",
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_SECRET_KEY
            }
        }
    )
    const { data: jsonData = {} } = jsonResponse;
    const { IpfsHash } = jsonData;
    const tokenURI = `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;
    console.log(tokenURI)
    return tokenURI;
}
//createJsonInfo();
async function mintNFT() {
    const tokenURI = await createJsonInfo();
    const provider = new ethers.providers.JsonRpcProvider(API_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const etherInterface = new ethers.utils.Interface(contract.abi);
    const nonce = await provider.getTransactionCount(PUBLIC_KEY, "latest")
    const gasPrice = await provider.getGasPrice();
    const network = await provider.getNetwork();
    const { chainId } = network;
    const transaction = {
        from: PUBLIC_KEY,
        to: CONTRACT_ADDRESS,
        nonce,
        chainId,
        gasPrice,
        data: etherInterface.encodeFunctionData("mintNFT",
            [PUBLIC_KEY, tokenURI])
    }
    const estimateGas = await provider.estimateGas(transaction)
    transaction["gasLimit"] = estimateGas;
    const singedTx = await wallet.signTransaction(transaction)
    const transactionReceipt = await provider.sendTransaction(singedTx);
    await transactionReceipt.wait()
    const hash = transactionReceipt.hash;
    console.log("Your Transaction hash is:", hash)

    const receipt = await provider.getTransactionReceipt(hash);
    const { logs } = receipt;
    const tokenInBigNumber = ethers.BigNumber.from(logs[0].topics[3]);
    const tokenId = tokenInBigNumber.toNumber();
    console.log("NFT token id", tokenId)
    return tokenId;
}
mintNFT()