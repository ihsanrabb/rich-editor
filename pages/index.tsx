import React from 'react';
import Head from 'next/head';
import styles from '@/styles/Home.module.css';
import Cookies from 'js-cookie';
import { GetServerSideProps } from 'next';

import { 
  createEditor, 
  BaseEditor, 
  Editor, 
  Transforms,
  Text,
  Element as SlateElement
} from 'slate';
import { 
  Slate, 
  Editable, 
  withReact, 
  ReactEditor,
  useSlate
} from 'slate-react'

type CustomText = { 
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

type CustomElement = { 
  type: string; 
  children: CustomText[];
}

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

const CustomEditor = {
  isMarkActive(editor, format) {
    const [match] = Editor.nodes(editor, {
      match: n => n[format] === true,
      universal: true,
    })

    return !!match
  },

  isBlockActive(editor, format) {
    const [match] = Editor.nodes(editor, {
      match: n => (
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        n.type === format
      )
    })

    return !!match
  },

  toggleMark(editor, format) {
    const isActive = CustomEditor.isMarkActive(editor, format);
    let newProperties: Partial<SlateElement> = { [format]: isActive ? null : true };
    Transforms.setNodes(
      editor,
      newProperties,
      { match: n => Text.isText(n), split: true }
    )
  },

  toggleBlock(editor, format) {
    const isActive = CustomEditor.isBlockActive(editor, format)
    Transforms.setNodes(
      editor,
      { type: isActive ? null : format },
    )
  }
}

export default function Home({ initialValue }) {
  const [editor] = React.useState(() => withReact(createEditor()))
  const renderElement = React.useCallback(props => <Element {...props} />, [])

  const renderLeaf = React.useCallback((props) => {
    return <Leaf {...props} />
  }, []);

  const handleKeyDown = (event) => {
    if (!event.ctrlKey) {
      return
    }

    switch (event.key) {
      case '`': {
        event.preventDefault()
        CustomEditor.toggleBlock(editor, "code")
        break;
      }

      case 'b': {
        event.preventDefault();
        CustomEditor.toggleMark(editor, "bold")
        break
      }

      case 'i': {
        event.preventDefault();
        CustomEditor.toggleMark(editor, "italic")
        break
      }
    }
  }

  const handleChange = (value) => {
    const isAstChange = editor.operations.some(
      op => 'set_selection' !== op.type
    )
    if (isAstChange) {
      const content = JSON.stringify(value)
      Cookies.set('content', content)
    }
  }

  return (
    <>
      <Head>
        <title>Rich Editor</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ marginBottom: '10px' }}>Rich Text with SlateJS</h1>
          <a href="https://github.com/ihsanrabb/rich-editor" target="_blank" rel="noreferrer">Source code</a>
        </div>
        <div className={styles.editor_wrapper}>
          <Slate 
            editor={Object.assign(editor, { id: '1' })}
            value={initialValue}
            onChange={handleChange}
          >
            <div className={styles.toolbar}>
              <MarkButton format="bold">
                <i className="fa fa-bold" aria-hidden="true"></i>
              </MarkButton>
              <MarkButton format="italic">
                <i className="fa fa-italic" aria-hidden="true"></i>
              </MarkButton>
              <MarkButton format="code">
                <i className="fa fa-code" aria-hidden="true"></i>
              </MarkButton>
              <BlockButton format="block-quote">
                <i className="fa fa-quote-right" aria-hidden="true"></i>
              </BlockButton>
            </div>
            <div style={{ padding: '10px' }}>
              <Editable 
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                onKeyDown={handleKeyDown}
                placeholder="Enter some text..."
              />
            </div>
          </Slate>
        </div>
      </main>
    </>
  )
}

const Element = ({ attributes, children, element }) => {
  switch (element.type) {
    case 'block-quote':
      return (
        <blockquote className={styles.blockquote} {...attributes}>
          {children}
        </blockquote>
      )
    case 'code':
      return (
        <pre {...attributes}>
          <code>{children}</code>
        </pre>
      )
    default:
      return (
        <p {...attributes}>
          {children}
        </p>
      )
  }
}

const Leaf = ({ attributes, children, leaf }) => {
  if(leaf.bold) {
    children = <strong>{children}</strong>
  }

  if (leaf.italic) {
    children = <em>{children}</em>
  }

  if (leaf.code) {
    children = <code>{children}</code>
  }

  return <span {...attributes}>{children}</span>
}

const MarkButton = ({ children, format }) => {
  const editor = useSlate();

  return (
    <button
      onClick={() => {
        CustomEditor.toggleMark(editor, format)
      }}
      className={styles.mark_button}
    >
      {children}
    </button>
  )
}

const BlockButton = ({ children, format }) => {
  const editor = useSlate();

  return (
    <button
      onClick={() => {
        CustomEditor.toggleBlock(editor, format)
      }}
      className={styles.mark_button}
    >
      {children}
    </button>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  let parseContent = null;
  if(req.cookies.content) {
    parseContent = JSON.parse(req.cookies.content);
  }
  const initialValue = parseContent || [
    {
      type: 'paragraph',
      children: [{ text: 'A line of text in a paragraph.' }],
    }
  ];
  
  return {
    props: {
      initialValue: initialValue,
    },
  }
}
