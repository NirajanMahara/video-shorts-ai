from setuptools import setup, find_packages

setup(
    name="video-short",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "opencv-python>=4.8.1.78",
        "moviepy>=1.0.3",
        "numpy>=1.26.2",
        "face-recognition>=1.3.0",
        "pydub>=0.25.1",
        "scipy>=1.11.4",
        "scikit-learn>=1.3.2",
        "torch>=2.1.2",
        "transformers>=4.36.2",
        "fastapi>=0.108.0",
        "python-multipart>=0.0.6",
        "uvicorn>=0.25.0",
        "python-dotenv>=1.0.0",
        "boto3>=1.34.11",
        "whisper>=1.1.10"
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.3",
            "black>=23.12.1",
            "isort>=5.13.2",
            "mypy>=1.8.0"
        ]
    },
    python_requires=">=3.8",
    author="Your Name",
    author_email="your.email@example.com",
    description="AI-powered video processing for generating engaging short-form content",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/video-short",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
) 