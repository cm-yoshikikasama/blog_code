from setuptools import setup, find_packages

setup(
    name="common",
    version="0.1",
    packages=find_packages(where="."),
    package_dir={"": "."},
    install_requires=["pendulum"],
)
