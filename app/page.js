'use client';

import { Box, Button, Stack, TextField, Typography, Link} from "@mui/material";
import { useState } from "react";
import {ThemeProvider, createMuiTheme, responsiveFontSizes} from "@mui/material";
import withStyles from "@mui/material";
import { ClassNames } from "@emotion/react";

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#74AA9C'
    },
    secondary: {
      main: '#448AFF'
    },
  },
  typography: {
    fontFamily: 'Quicksand',
    fontWeightLight: 400,
    fontWeightRegular: 500,
    fontWeightMedium: 600,
    fontWeightBold: 700,
  },
})

const style = {
  link: {

  }
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm the Rate My Professor support assistant. How can I help you today?",
      fontFamily: 'Quicksand',
      fontWeightLight: 400,
      fontWeightRegular: 500,
      fontWeightMedium: 600,
      fontWeightBold: 700,
    }
  ])

  const [message, setMessage] = useState('')
  const sendMessage = async () => {
    setMessages((messages) => [
      ...messages,
      {role: "user", content: message},
      {role: "assistant", content: ''}
    ])

    setMessage('')
    const response = fetch('/api/chat', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([...messages, {role: "user", content: message}])
    }).then(async(res) =>{
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let result = ''
      return reader.read().then(function processText({done, value}){
        if(done){
          return result
        }
        const text = decoder.decode(value || new Uint8Array(), {stream: true})
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1]
          let otherMessages = messages.slice(0, messages.length - 1)
          return [
            ...otherMessages,
            {...lastMessage, content: lastMessage.content + text},
          ]
        })

        return reader.read().then(processText)
      })
    })
  }

  return (
    <ThemeProvider theme={responsiveFontSizes(theme)} flexDirection="row">
      <Box
        width="100vw" 
        height="100vh" 
        display="flex" 
        flexDirection="row" 
        justifyContent="center" 
        alignItems="center"
        bgcolor= "#282828"
        alignContent="flex-end"
        spacing = {12}
      >
        <Link className="link-decoration" underline="hover">
          <Typography variant="h1" m={10} fontWeightBold color="white">
            Rate My Professor.
          </Typography>
        </Link>
        <Stack 
          direction="column" 
          width="850px" 
          height="750px" 
          border="1px solid black" 
          p={2} 
          spacing={12}
          borderRadius={4}
          borderColor="white"
          bgcolor="white"
          boxShadow= "0px 0px 50px white"
          m={2}
        >
          <Stack 
            direction="column" 
            spacing={2} 
            flexGrow={1} 
            overflow="auto" 
            maxHeight="100%"
          >
          {
            messages.map((message, index) =>(
              <Box 
                key={index} 
                display="flex" 
                justifyContent={
                  message.role === "assistant" ? 'flex-start' : 'flex-end'
                }
              >
                <Box 
                  bgcolor={
                    message.role === "assistant" ? "primary.main" : "secondary.main"
                  }
                  color="white"
                  borderRadius={16}
                  p={3}
                  fontFamily='Quicksand'
                >
                  {message.content}
                </Box>
              </Box>
            ))
          }
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField 
              label="Message" 
              fullWidth
              value={message}
              onChange={(e)=>{
                setMessage(e.target.value)
              }}
            />
            <Button variant="contained" onClick={sendMessage}>
              <Typography color="white">
                Send
              </Typography>
            </Button>
          </Stack>
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
